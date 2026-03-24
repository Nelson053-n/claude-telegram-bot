# NewBot Web

React приложение для управления генерациями, просмотра истории и покупки токенов.

## Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Features

- 🔐 Telegram OAuth login
- 📋 Gallery of generations with filtering
- 💰 Token management
- 💳 Stripe payments integration
- 📱 Responsive design with TailwindCSS
- 🎨 Modern UI with smooth animations

## Architecture

```
React + Vite
├── lib/
│   ├── api.ts - Axios client + API routes
│   └── store.ts - Zustand state management
├── components/
│   ├── GenerationCard.tsx
│   ├── Gallery.tsx
│   └── ...
└── pages/
    ├── LoginPage.tsx
    ├── HomePage.tsx
    └── ...
```

## Environment Variables

```env
VITE_API_URL=http://localhost:3000/api
```

## Authentication Flow

1. User clicks "Login with Telegram"
2. Redirects to Telegram bot with `start=web_app` parameter
3. Bot generates JWT token and redirects to web app with `?token=...`
4. Token stored in localStorage
5. All API requests include `Authorization: Bearer <token>`

## State Management

Uses Zustand for simple, efficient state:

```typescript
const { token, user, generations } = useStore();
```

## API Integration

Axios client with automatic token injection and 401 error handling:

```typescript
const response = await generationsAPI.list();
const { token } = await authAPI.loginWithTelegram(telegramId);
```

## Styling

TailwindCSS v3 with responsive breakpoints and custom colors:

- Primary: `#8b5cf6` (purple)
- Secondary: `#ec4899` (pink)

## Building & Deployment

```bash
# Production build
npm run build

# Output to dist/
# Deploy to static hosting (Netlify, Vercel, etc)
```

## Future Features

- [ ] Real-time generation status updates (WebSocket)
- [ ] Advanced filtering and search
- [ ] Generation sharing
- [ ] Export/download results
- [ ] Admin dashboard
- [ ] Dark mode
