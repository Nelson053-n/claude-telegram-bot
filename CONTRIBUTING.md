# Contributing to NewBot

Спасибо за интерес к разработке NewBot! Вот как помочь проекту.

## Development Setup

```bash
# Clone repo
git clone <repo>
cd newbot

# Install dependencies
bun install
cd web && npm install && cd ..

# Setup environment
cp .env.example .env

# Start development stack
docker-compose up -d
bun bot.ts &
cd web && npm run dev &
```

## Project Structure

```
newbot/
├── bot.ts                 # Telegram bot (Grammy)
├── ask-claude.sh         # Claude CLI wrapper
├── api/                  # REST API (Express)
│   ├── server.ts         # Entry point
│   ├── models.ts         # DB queries
│   ├── routes/           # API endpoints
│   ├── db/               # Database config
│   └── middleware.ts     # Auth, CORS
├── web/                  # React app
│   ├── src/
│   │   ├── pages/        # Pages
│   │   ├── components/   # React components
│   │   └── lib/          # API client, store
│   └── package.json
└── docker-compose.yml    # Development stack
```

## Code Style

### TypeScript
- Use strict mode
- Type all function parameters and returns
- Use interfaces for object types
- No `any` without explanation

### Bot (TypeScript)
- Arrow functions for handlers
- Async/await for async code
- Console.log with timestamps

### API (TypeScript)
- Express route handlers with proper types
- Error handling with try/catch
- Database queries with prepared statements

### React (TypeScript)
- Functional components with hooks
- Props typing with interfaces
- Use Zustand for state

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: description of changes"

# Push to GitHub
git push origin feature/your-feature

# Create Pull Request on GitHub
```

## Commit Message Format

```
type(scope): subject

body

footer
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

Examples:
```
feat(api): add generation history endpoint
fix(bot): handle voice transcription errors
docs(web): add deployment guide
```

## Testing

### Manual Testing

```bash
# Test Telegram bot
# 1. Send /help command
# 2. Send text message
# 3. Send voice message
# 4. Check /status
# 5. Send /reset

# Test API
curl -X POST http://localhost:3000/api/auth/telegram \
  -H "Content-Type: application/json" \
  -d '{"telegramId": 12345}'

# Test Web
# Open http://localhost:5173
# Go through login flow
# Check generation gallery
```

### Automated Testing (future)
```bash
# npm test -- runs Jest tests
```

## Adding Features

### New Bot Command
1. Add handler in `bot.ts`
2. Add to `/help` message
3. Test in Telegram
4. Document in README.md

Example:
```typescript
if (text === "/mycommand") {
  await ctx.reply("Response");
  return;
}
```

### New API Endpoint
1. Add route in `api/routes/`
2. Add database query in `api/models.ts`
3. Add tests
4. Document in `api/README.md`

Example:
```typescript
router.get("/data", authMiddleware, async (req, res) => {
  const { userId } = req;
  const data = await getDataForUser(userId);
  res.json(data);
});
```

### New Web Component
1. Create component in `web/src/components/`
2. Export from component file
3. Import and use in pages
4. Style with TailwindCSS

Example:
```tsx
export const MyComponent: React.FC<Props> = ({ prop }) => (
  <div className="p-4 bg-white rounded">
    {prop}
  </div>
);
```

## Database Changes

### Adding a new table
1. Edit `api/db/schema.sql`
2. Add migration function in `api/db/client.ts`
3. Database initializes on API startup
4. Update models in `api/models.ts`

### Adding a column
1. Update schema.sql with ALTER TABLE
2. Create migration function
3. Test with fresh database

## Dependencies

### Adding a dependency

```bash
# Backend
bun add package-name
bun add -d @types/package-name

# Frontend
cd web && npm install package-name
```

Update package.json and commit.

## Documentation

- Update README.md for major changes
- Add comments for complex logic
- Document API endpoints
- Update DEPLOYMENT.md for infra changes

## Troubleshooting

### Bun issues
```bash
bun upgrade
bun cache clean
```

### PostgreSQL issues
```bash
docker-compose down -v  # Delete data
docker-compose up -d     # Fresh start
```

### Node/npm issues
```bash
cd web
npm cache clean --force
rm -rf node_modules
npm install
```

## Performance Tips

- Use indexes for database queries
- Cache frequently accessed data
- Lazy load React components
- Minimize bundle size
- Use Redis for sessions (future)

## Security Considerations

- Never commit secrets (.env files)
- Validate all user input
- Use parameterized queries
- Set CORS properly
- Use HTTPS in production
- Keep dependencies updated

## Review Checklist

Before submitting PR:
- [ ] Code follows style guide
- [ ] All tests pass
- [ ] No console errors
- [ ] README updated if needed
- [ ] No secrets committed
- [ ] Commit messages follow format
- [ ] Works in development

## Questions?

- Check existing issues
- Create new issue with details
- Ask in discussions
- Read relevant documentation files

## License

By contributing, you agree your code will be under the same license as the project.

Thank you for contributing! 🙏
