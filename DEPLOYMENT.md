# NewBot Deployment Guide

Инструкции по развёртыванию NewBot на различных платформах.

## Local Development

### Требования
- Bun runtime (https://bun.sh)
- Node.js 18+ (для веб-приложения)
- Docker & Docker Compose
- Telegram Bot Token (от @BotFather)
- OpenAI API Key (для голоса)

### Setup

```bash
# 1. Clone и install
git clone <repo>
cd newbot
bun install
cd web && npm install && cd ..

# 2. Create .env
cp .env.example .env

# 3. Fill secrets in .env
# TELEGRAM_BOT_TOKEN=...
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

# 4. Start services
docker-compose up -d

# 5. Run bot (in separate terminal)
bun bot.ts

# 6. Run web (in web/ directory, separate terminal)
cd web && npm run dev

# Services available at:
# - Bot: Telegram @your_bot
# - API: http://localhost:3000
# - Web: http://localhost:5173
```

## Docker Deployment

### Production Build

```bash
# Build all images
docker-compose -f docker-compose.prod.yml build

# Run containers
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f
```

### Environment Variables

```bash
# Copy and edit for production
cp .env.example .env.production

# Set production secrets
TELEGRAM_BOT_TOKEN=...
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
JWT_SECRET=very-secure-random-string-here
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## Cloud Deployment

### Heroku

```bash
# 1. Create Heroku account and install CLI
curl https://cli-assets.heroku.com/install.sh | sh

# 2. Login and create app
heroku login
heroku create newbot-app

# 3. Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# 4. Set environment variables
heroku config:set TELEGRAM_BOT_TOKEN=...
heroku config:set OPENAI_API_KEY=...
heroku config:set ANTHROPIC_API_KEY=...
heroku config:set JWT_SECRET=...

# 5. Deploy
git push heroku main

# 6. View logs
heroku logs -t
```

**Procfile:**
```
bot: bun bot.ts
web: serve -s web/dist -l 5173
api: bun run api
```

### Railway (Recommended)

1. Connect GitHub repo to Railway
2. Create services:
   - PostgreSQL database
   - Bun API service
   - Node web service
   - Bot service (worker)

3. Set environment variables in Railway dashboard
4. Auto-deploy on push

### AWS EC2

```bash
# 1. SSH into instance
ssh -i key.pem ubuntu@instance.com

# 2. Install dependencies
curl https://bun.sh | bash
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh

# 3. Clone repo
git clone <repo>
cd newbot

# 4. Create .env with production secrets
nano .env

# 5. Start with Docker Compose
docker-compose up -d

# 6. Use nginx as reverse proxy
# Create /etc/nginx/sites-available/newbot
upstream api {
  server localhost:3000;
}
upstream web {
  server localhost:5173;
}
server {
  listen 80;
  server_name newbot.example.com;

  location /api {
    proxy_pass http://api;
  }
  location / {
    proxy_pass http://web;
  }
}

# 7. Start nginx
sudo systemctl start nginx
```

### DigitalOcean App Platform

1. Connect GitHub repository
2. Create app.yaml:

```yaml
name: newbot
services:
- name: api
  github:
    repo: your-repo
    branch: main
  build_command: bun install
  run_command: bun run api
  envs:
  - key: DATABASE_URL
    scope: RUN_AND_BUILD_TIME
    value: ${db.DATABASE_URL}
  http_port: 3000

- name: web
  github:
    repo: your-repo
    branch: main
  build_command: cd web && npm install && npm run build
  run_command: npm install -g serve && serve -s web/dist -l 5173
  http_port: 5173

databases:
- name: db
  engine: PG
  version: "16"
```

3. Deploy via DigitalOcean dashboard

## Database Setup

### PostgreSQL Initialization

```bash
# Connect to database
psql -h localhost -U postgres -d newbot

# Run schema
\i api/db/schema.sql

# Check tables
\dt
```

### Backup & Restore

```bash
# Backup
pg_dump -U postgres -d newbot > backup.sql

# Restore
psql -U postgres -d newbot < backup.sql
```

## Monitoring

### Logs

```bash
# Docker
docker-compose logs -f api
docker-compose logs -f web

# System
journalctl -u newbot -f
```

### Health Checks

```bash
# API
curl http://localhost:3000/health

# Bot (check logs)
docker logs newbot-bot

# DB
docker exec newbot-postgres pg_isready
```

## SSL/HTTPS

### Let's Encrypt (with nginx)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d newbot.example.com
```

### Update nginx config
```nginx
listen 443 ssl;
ssl_certificate /etc/letsencrypt/live/newbot.example.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/newbot.example.com/privkey.pem;
```

## Troubleshooting

### Bot not responding
1. Check token in .env
2. Verify TELEGRAM_BOT_TOKEN is set
3. Check logs: `tail -f bot.log`

### API errors
1. Verify PostgreSQL is running
2. Check database connection: `psql -c "SELECT 1"`
3. View API logs: `docker logs newbot-api`

### Web not loading
1. Check API is accessible
2. Verify CORS_ORIGIN in .env
3. Browser console for errors

### Database issues
1. Check container health: `docker ps`
2. Connect directly: `psql -h localhost`
3. Reset database: `docker-compose down -v && docker-compose up`

## Updates & Maintenance

### Deploy updates
```bash
git pull
docker-compose up -d --build
```

### Database migrations
```bash
# Automatic on API startup
# Check api/db/schema.sql for schema
```

### Backup schedule
```bash
# Add to crontab
0 2 * * * pg_dump -h localhost -U postgres newbot > /backups/newbot-$(date +\%Y\%m\%d).sql
```

## Performance Tuning

### PostgreSQL
```sql
-- Connection pooling (use PgBouncer)
-- Increase shared_buffers
-- Add indexes for common queries
```

### Application
```
- Enable Redis caching
- Compress assets
- Use CDN for static files
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Set HTTPS/SSL
- [ ] Enable firewall
- [ ] Rotate secrets periodically
- [ ] Enable database backups
- [ ] Set up monitoring
- [ ] Use environment variables for secrets
- [ ] Keep dependencies updated
- [ ] Enable rate limiting
- [ ] Set up CORS properly

## Support

For issues, check:
1. README.md - main documentation
2. api/README.md - API documentation
3. web/README.md - web app documentation
4. GitHub issues - community support
