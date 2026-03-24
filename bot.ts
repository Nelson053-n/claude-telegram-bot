import { Bot } from "grammy";
import { homedir } from "os";
import { join } from "path";
import { readFileSync } from "fs";

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

const bot = new Bot(token);

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

async function askClaude(prompt: string): Promise<string> {
  const proc = Bun.spawn(["/home/nel/newbot/ask-claude.sh", prompt], {
    cwd: "/home/nel/newbot",
    stdout: "pipe",
    stderr: "pipe",
  });

  const timeout = setTimeout(() => proc.kill(), 120_000);

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  clearTimeout(timeout);

  console.log(`Claude done: code=${exitCode}, stdout=${stdout.length}b, stderr=${stderr.length}b`);
  if (stderr) console.log(`stderr: ${stderr.slice(0, 300)}`);

  if (stdout.trim()) return stdout.trim();
  throw new Error(`Claude exited ${exitCode}, stderr: ${stderr.slice(0, 200)}`);
}

// Typing indicator interval
function startTyping(chatId: number): ReturnType<typeof setInterval> {
  const fn = () => bot.api.sendChatAction(chatId, "typing").catch(() => {});
  fn();
  return setInterval(fn, 4000);
}

bot.on("message:text", async (ctx) => {
  const userId = String(ctx.from.id);
  if (allowedUsers.length > 0 && !allowedUsers.includes(userId)) return;

  const text = ctx.message.text;

  if (isRateLimited(userId)) {
    await ctx.reply("Слишком много запросов. Подождите минуту.").catch(() => {});
    return;
  }

  console.log(`[${new Date().toISOString()}] ${ctx.from.username}: ${text}`);

  const typing = startTyping(ctx.chat.id);

  try {
    const reply = await askClaude(text);
    clearInterval(typing);

    if (reply.length <= 4096) {
      await ctx.reply(reply);
    } else {
      const chunks = reply.match(/.{1,4096}/gs) || [reply];
      for (const chunk of chunks) {
        await ctx.reply(chunk);
      }
    }
    console.log(`[${new Date().toISOString()}] Replied (${reply.length} chars)`);
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
