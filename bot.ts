import { Bot } from "grammy";
import { homedir } from "os";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { randomUUID } from "crypto";
import https from "https";
import { createWriteStream, unlinkSync } from "fs";

// Load token
const envPath = join(homedir(), ".claude", "channels", "telegram", ".env");
let token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  try {
    const envContent = readFileSync(envPath, "utf-8");
    const match = envContent.match(/TELEGRAM_BOT_TOKEN=(.+)/);
    if (match) token = match[1].trim();
  } catch {}
}
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN not found");
  process.exit(1);
}

// Load access config
const accessPath = join(homedir(), ".claude", "channels", "telegram", "access.json");
let allowedUsers: string[] = [];
try {
  const access = JSON.parse(readFileSync(accessPath, "utf-8"));
  allowedUsers = access.allowFrom || [];
} catch {}

// ── Session management ──────────────────────────────────────────────
interface UserSession {
  mainSessionId: string;
  quickSessionId: string | null;
  quickSessionUsed: boolean;
  messageCount: number;
  activeBackground: {
    prompt: string;
    startedAt: string;
  } | null;
}

const sessionsFile = join("/home/nel/newbot", "sessions.json");
let sessions: Record<string, UserSession> = {};
try {
  if (existsSync(sessionsFile)) {
    const raw = JSON.parse(readFileSync(sessionsFile, "utf-8"));
    // Migrate old format
    for (const [k, v] of Object.entries(raw)) {
      const val = v as any;
      if (val.sessionId && !val.mainSessionId) {
        sessions[k] = {
          mainSessionId: val.sessionId,
          quickSessionId: null,
          quickSessionUsed: false,
          messageCount: val.messageCount || 0,
          activeBackground: null,
        };
      } else {
        sessions[k] = val as UserSession;
        if (sessions[k].quickSessionUsed === undefined) sessions[k].quickSessionUsed = false;
      }
    }
  }
} catch {}

function saveSessions() {
  writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2));
}

function getOrCreateSession(userId: string): { sessionId: string; isNew: boolean } {
  if (sessions[userId]) {
    sessions[userId].messageCount++;
    saveSessions();
    // If background task is running, use quick session
    if (sessions[userId].activeBackground && sessions[userId].quickSessionId) {
      const isNewQuick = !sessions[userId].quickSessionUsed;
      sessions[userId].quickSessionUsed = true;
      saveSessions();
      return { sessionId: sessions[userId].quickSessionId!, isNew: isNewQuick };
    }
    return { sessionId: sessions[userId].mainSessionId, isNew: false };
  }
  const sessionId = randomUUID();
  sessions[userId] = {
    mainSessionId: sessionId,
    quickSessionId: null,
    quickSessionUsed: false,
    messageCount: 1,
    activeBackground: null,
  };
  saveSessions();
  return { sessionId, isNew: true };
}

// ── Bot setup ───────────────────────────────────────────────────────
const bot = new Bot(token);

const QUICK_TIMEOUT = 45_000;   // 45s for initial try
const BG_TIMEOUT = 600_000;     // 10 min for background tasks

// Rate limiting: max 5 requests per minute per user
const rateLimits = new Map<string, number[]>();
function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const window = 60_000;
  const maxRequests = 5;
  const timestamps = (rateLimits.get(userId) || []).filter(t => now - t < window);
  if (timestamps.length >= maxRequests) return true;
  timestamps.push(now);
  rateLimits.set(userId, timestamps);
  return false;
}

// ── Voice transcription ─────────────────────────────────────────────
async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      res.pipe(createWriteStream(dest));
      res.on("end", resolve);
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function transcribeVoice(fileId: string, ctx: any): Promise<string> {
  try {
    // Get file info
    const file = await ctx.api.getFile(fileId);
    const filePath = file.file_path;
    const url = `https://api.telegram.org/file/bot${ctx.api.token}/${filePath}`;

    // Download OGG file
    const tmpFile = `/tmp/voice_${randomUUID()}.ogg`;
    await downloadFile(url, tmpFile);

    // Transcribe using Claude's Anthropic SDK (if available via spawned process)
    // For now, use a simple approach: spawn a worker that calls OpenAI Whisper or similar
    // As fallback, we'll just log and ask user to repeat in text
    const transcript = await transcribeWithWhisper(tmpFile);

    // Clean up
    try { unlinkSync(tmpFile); } catch {}

    return transcript;
  } catch (err: any) {
    console.error("Voice transcription error:", err.message);
    throw new Error("Не удалось распознать голос. Пожалуйста, отправьте текстом.");
  }
}

async function transcribeWithWhisper(filePath: string): Promise<string> {
  // Check if we have OPENAI_API_KEY
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const formData = new FormData();
  const fileBuffer = readFileSync(filePath);
  formData.append("file", new Blob([fileBuffer]), "audio.ogg");
  formData.append("model", "whisper-1");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whisper API error: ${error}`);
  }

  const result = await response.json() as { text?: string };
  return result.text || "";
}

// ── Claude invocation ───────────────────────────────────────────────
interface ClaudeResult {
  text: string;
  timedOut: boolean;
}

async function askClaude(
  prompt: string,
  sessionId: string,
  isNew: boolean,
  timeout: number,
): Promise<ClaudeResult> {
  const args = ["/home/nel/newbot/ask-claude.sh", prompt, sessionId, isNew ? "new" : "resume"];
  const proc = Bun.spawn(args, {
    cwd: "/home/nel/newbot",
    stdout: "pipe",
    stderr: "pipe",
  });

  let killed = false;
  const timer = setTimeout(() => {
    killed = true;
    proc.kill();
  }, timeout);

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  clearTimeout(timer);

  console.log(`Claude done: code=${exitCode}, stdout=${stdout.length}b, stderr=${stderr.length}b, session=${sessionId.slice(0, 8)}, killed=${killed}`);
  if (stderr) console.log(`stderr: ${stderr.slice(0, 300)}`);

  if (killed) {
    return { text: "", timedOut: true };
  }

  if (stdout.trim()) {
    return { text: stdout.trim(), timedOut: false };
  }

  throw new Error(`Claude exited ${exitCode}, stderr: ${stderr.slice(0, 200)}`);
}

// ── Background task runner ──────────────────────────────────────────
// Track running background processes per user
const backgroundProcs = new Map<string, ReturnType<typeof Bun.spawn>>();

async function runBackground(prompt: string, userId: string, chatId: number) {
  const session = sessions[userId];
  if (!session) return;

  // Create quick session for parallel questions
  session.quickSessionId = randomUUID();
  session.quickSessionUsed = false;
  session.activeBackground = {
    prompt: prompt.slice(0, 200),
    startedAt: new Date().toISOString(),
  };
  saveSessions();

  console.log(`[${new Date().toISOString()}] Background started for ${userId}: ${prompt.slice(0, 80)}`);

  try {
    // Run with long timeout on main session
    const result = await askClaude(prompt, session.mainSessionId, false, BG_TIMEOUT);

    if (result.timedOut) {
      await bot.api.sendMessage(chatId, "Задача не завершилась за 10 минут. Попробуйте разбить на части.").catch(() => {});
    } else if (result.text) {
      // Send result, splitting if needed
      const reply = result.text;
      if (reply.length <= 4096) {
        await bot.api.sendMessage(chatId, reply);
      } else {
        const chunks = reply.match(/.{1,4096}/gs) || [reply];
        for (const chunk of chunks) {
          await bot.api.sendMessage(chatId, chunk);
        }
      }
      console.log(`[${new Date().toISOString()}] Background done for ${userId} (${reply.length} chars)`);
    }
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] Background error for ${userId}:`, err.message || err);
    await bot.api.sendMessage(chatId, "Фоновая задача завершилась с ошибкой.").catch(() => {});
  } finally {
    // Clean up: remove quick session, clear background state
    if (sessions[userId]) {
      sessions[userId].quickSessionId = null;
      sessions[userId].quickSessionUsed = false;
      sessions[userId].activeBackground = null;
      saveSessions();
    }
    backgroundProcs.delete(userId);
    await bot.api.sendMessage(chatId, "Фоновая задача завершена. Контекст основной сессии восстановлен.").catch(() => {});
  }
}

// ── Typing indicator ────────────────────────────────────────────────
function startTyping(chatId: number): ReturnType<typeof setInterval> {
  const fn = () => bot.api.sendChatAction(chatId, "typing").catch(() => {});
  fn();
  return setInterval(fn, 4000);
}

// ── Send reply with chunking ────────────────────────────────────────
async function sendReply(ctx: any, text: string) {
  if (text.length <= 4096) {
    await ctx.reply(text);
  } else {
    const chunks = text.match(/.{1,4096}/gs) || [text];
    for (const chunk of chunks) {
      await ctx.reply(chunk);
    }
  }
}

// ── Voice message handler ───────────────────────────────────────────
bot.on("message:voice", async (ctx) => {
  const userId = String(ctx.from.id);
  if (allowedUsers.length > 0 && !allowedUsers.includes(userId)) return;

  const fileId = ctx.message.voice.file_id;
  const typing = startTyping(ctx.chat.id);

  try {
    console.log(`[${new Date().toISOString()}] ${ctx.from.username}: [голосовое сообщение]`);

    // Transcribe voice to text
    const transcript = await transcribeVoice(fileId, ctx);
    console.log(`[${new Date().toISOString()}] Transcript: ${transcript}`);

    if (!transcript.trim()) {
      clearInterval(typing);
      await ctx.reply("Не удалось разобрать голос. Попробуйте ещё раз или отправьте текстом.");
      return;
    }

    // Process as normal text message
    if (isRateLimited(userId)) {
      clearInterval(typing);
      await ctx.reply("Слишком много запросов. Подождите минуту.").catch(() => {});
      return;
    }

    const { sessionId, isNew } = getOrCreateSession(userId);
    const isQuickMode = sessions[userId]?.activeBackground != null;

    // Prefix transcript with [голос]
    const promptWithPrefix = `[голос] ${transcript}`;

    if (isQuickMode) {
      const result = await askClaude(promptWithPrefix, sessionId, isNew, 120_000);
      clearInterval(typing);
      if (result.text) {
        await sendReply(ctx, result.text);
        console.log(`[${new Date().toISOString()}] Quick reply (${result.text.length} chars)`);
      }
      return;
    }

    const result = await askClaude(promptWithPrefix, sessionId, isNew, QUICK_TIMEOUT);
    clearInterval(typing);

    if (!result.timedOut) {
      await sendReply(ctx, result.text);
      console.log(`[${new Date().toISOString()}] Replied (${result.text.length} chars)`);
      return;
    }

    // Timed out — switch to background
    await ctx.reply(
      "Задача сложная, выполняю в фоне. Можете продолжать задавать вопросы — " +
      "они пойдут в параллельную сессию.\n\n" +
      "Отправьте /status чтобы узнать прогресс."
    ).catch(() => {});

    runBackground(promptWithPrefix, userId, ctx.chat.id);

  } catch (err: any) {
    clearInterval(typing);
    console.error(`[${new Date().toISOString()}] Voice error:`, err.message || err);
    await ctx.reply(err.message || "Произошла ошибка при обработке голоса.").catch(() => {});
  }
});

// ── Message handler ─────────────────────────────────────────────────
bot.on("message:text", async (ctx) => {
  const userId = String(ctx.from.id);
  if (allowedUsers.length > 0 && !allowedUsers.includes(userId)) return;

  const text = ctx.message.text;

  // Command: /reset — clear all sessions
  if (text === "/reset") {
    delete sessions[userId];
    saveSessions();
    await ctx.reply("Контекст очищен. Начинаем новый диалог.").catch(() => {});
    return;
  }

  // Command: /help — show available commands
  if (text === "/help") {
    await ctx.reply(
      "📌 Доступные команды:\n\n" +
      "📝 Текстовые сообщения — обычный диалог с Claude\n" +
      "🎙️ Голосовые сообщения — автоматически распознаются и обрабатываются\n\n" +
      "/reset — очистить контекст сессии\n" +
      "/status — показать статус фоновой задачи\n" +
      "/help — эта справка\n\n" +
      "💡 Длинные задачи автоматически переходят в фоновый режим (за 45 сек), " +
      "можно продолжать спрашивать параллельно."
    ).catch(() => {});
    return;
  }

  // Command: /status — show background task status
  if (text === "/status") {
    const session = sessions[userId];
    if (session?.activeBackground) {
      const elapsed = Math.round((Date.now() - new Date(session.activeBackground.startedAt).getTime()) / 1000);
      await ctx.reply(
        `Фоновая задача выполняется (${elapsed}с).\n` +
        `Задача: ${session.activeBackground.prompt}\n\n` +
        `Вы можете задавать вопросы — они идут в параллельную сессию.`
      ).catch(() => {});
    } else {
      await ctx.reply("Нет активных фоновых задач.").catch(() => {});
    }
    return;
  }

  if (isRateLimited(userId)) {
    await ctx.reply("Слишком много запросов. Подождите минуту.").catch(() => {});
    return;
  }

  console.log(`[${new Date().toISOString()}] ${ctx.from.username}: ${text}`);

  const typing = startTyping(ctx.chat.id);

  try {
    const { sessionId, isNew } = getOrCreateSession(userId);
    const isQuickMode = sessions[userId]?.activeBackground != null;

    // If background task is running, use quick session with normal timeout
    if (isQuickMode) {
      const result = await askClaude(text, sessionId, isNew, 120_000);
      clearInterval(typing);
      if (result.text) {
        await sendReply(ctx, result.text);
        console.log(`[${new Date().toISOString()}] Quick reply (${result.text.length} chars)`);
      }
      return;
    }

    // Phase 1: Quick try (30s)
    const result = await askClaude(text, sessionId, isNew, QUICK_TIMEOUT);
    clearInterval(typing);

    if (!result.timedOut) {
      // Fast response — send as usual
      await sendReply(ctx, result.text);
      console.log(`[${new Date().toISOString()}] Replied (${result.text.length} chars)`);
      return;
    }

    // Phase 2: Timed out — switch to background
    await ctx.reply(
      "Задача сложная, выполняю в фоне. Можете продолжать задавать вопросы — " +
      "они пойдут в параллельную сессию.\n\n" +
      "Отправьте /status чтобы узнать прогресс."
    ).catch(() => {});

    // Fire and forget — runs in background
    runBackground(text, userId, ctx.chat.id);

  } catch (err: any) {
    clearInterval(typing);
    console.error(`[${new Date().toISOString()}] Error:`, err.message || err);
    await ctx.reply("Произошла ошибка. Попробуйте ещё раз.").catch(() => {});
  }
});

bot.catch((err) => {
  console.error("Bot error:", err.error);
});

console.log("Starting bot...");
bot.start({
  onStart: (info) => console.log(`Polling as @${info.username}`),
});
