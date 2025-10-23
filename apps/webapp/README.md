# TeslaGuard WebApp

Next.js-based SEO-friendly web application for TeslaGuard.

## Features

- ✅ Server-Side Rendering (SSR) with Next.js App Router
- ✅ SEO Optimized with metadata and Open Graph tags
- ✅ Tesla OAuth Authentication
- ✅ Vehicle Management Dashboard
- ✅ Telegram Bot Integration with Deep Linking
- ✅ Telemetry Configuration
- ✅ Responsive Design with Tailwind CSS
- ✅ Dark Mode Support

## Environment Variables

Create a `.env.local` file in the root of this directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Development

```bash
# Install dependencies (from workspace root)
yarn install

# Run development server
npx nx serve webapp

# Build for production
npx nx build webapp

# Preview production build
npx nx preview webapp
```

## Pages

- `/` - Landing page with Tesla login
- `/callback` - OAuth callback handler
- `/dashboard` - Main dashboard (protected)
- `/dashboard/vehicles` - Vehicle management
- `/dashboard/telegram` - Telegram configuration

## Architecture

- **App Router**: Next.js 15 with App Router for SSR
- **API Communication**: RESTful API client with automatic userId header injection
- **State Management**: React hooks for auth, vehicles, and Telegram
- **Styling**: Tailwind CSS with custom Tesla theme colors
- **TypeScript**: Fully typed for better DX

## API Integration

The webapp communicates with the TeslaGuard API backend:

- Auth endpoints: `/auth/tesla/login`, `/callback/auth`
- Vehicle endpoints: `/telemetry-config/*`
- Telegram endpoints: `/telegram/*`

All authenticated requests include the `X-User-Id` header automatically.

