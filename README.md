# TeslaGuard

**Real-time Tesla vehicle monitoring and security alerts via Telegram**

TeslaGuard is a comprehensive security monitoring solution for Tesla vehicles. It tracks your vehicle's Sentry Mode status and sends instant Telegram notifications when suspicious activity is detected.

## ✨ Features

- 🔐 **Tesla OAuth Authentication** - Secure login with your Tesla account
- 📱 **Telegram Integration** - Instant alerts via deep linking (no manual chatId setup)
- 🚗 **Multi-Vehicle Support** - Monitor all your Tesla vehicles
- 📊 **Real-time Telemetry** - Track Sentry Mode, battery, location, and more
- 🌐 **SEO-Friendly WebApp** - Next.js with server-side rendering
- 🔒 **Secure by Design** - Encrypted token storage, secure communication
- 🎨 **Modern UI** - Beautiful, responsive interface with Tailwind CSS
- 🌙 **Dark Mode** - Full dark mode support

## 🏗️ Architecture

This is an Nx monorepo containing:

- **`apps/api`** - NestJS backend API with TypeORM + PostgreSQL
- **`apps/webapp`** - Next.js 15 frontend with App Router (SEO-optimized)

### Tech Stack

**Backend:**
- NestJS - Node.js framework
- TypeORM - ORM with PostgreSQL
- Telegraf - Telegram Bot API
- Tesla Fleet API - Official Tesla API

**Frontend:**
- Next.js 15 - React framework with SSR
- React 19 - UI library
- Tailwind CSS - Styling
- TypeScript - Type safety

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Yarn
- PostgreSQL 14+
- Tesla Developer account
- Telegram Bot (via @BotFather)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/TeslaGuard.git
cd TeslaGuard

# Install dependencies
yarn install

# Setup PostgreSQL database
createdb teslaguard

# Configure environment variables
cp apps/api/env.example apps/api/.env
# Edit apps/api/.env with your credentials

cp apps/webapp/.env.example apps/webapp/.env.local
# Edit apps/webapp/.env.local

# Start the API
npx nx serve api

# In another terminal, start the webapp
npx nx serve webapp
```

Visit http://localhost:4200 to access the application.

**📖 For detailed setup instructions, see [SETUP.md](./SETUP.md)**

## 📱 How to Use

### 1. Login with Tesla
- Visit the webapp and click "Login with Tesla"
- Authenticate with your Tesla account
- You'll be redirected to your dashboard

### 2. Configure Vehicles
- Go to the Vehicles page
- Your Tesla vehicles will be automatically synced
- Enable telemetry for each vehicle you want to monitor

### 3. Link Telegram
- Go to the Telegram page
- Click "Generate Telegram Link"
- Open the link in Telegram
- Your account is now linked!
- Test with "Send Test Message"

### 4. Receive Alerts
- When Sentry Mode is triggered, you'll receive an instant Telegram notification
- Alerts include: vehicle info, location, battery level, timestamp

## 🔧 Development

### Run the API
```bash
npx nx serve api
```

### Run the WebApp
```bash
npx nx serve webapp
```

### Build for production
```bash
# API
npx nx build api

# WebApp
npx nx build webapp
```

### Run tests
```bash
# API tests
npx nx test api

# WebApp tests
npx nx test webapp
```

### Lint code
```bash
npx nx lint api
npx nx lint webapp
```

## 📊 Project Structure

```
TeslaGuard/
├── apps/
│   ├── api/                    # NestJS Backend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── auth/       # Tesla OAuth
│   │   │   │   ├── telemetry/  # Vehicle telemetry
│   │   │   │   ├── telegram/   # Telegram bot
│   │   │   │   └── zmq/        # ZMQ service
│   │   │   ├── entities/       # TypeORM entities
│   │   │   ├── config/         # Configuration
│   │   │   └── common/         # Shared utilities
│   │   └── env.example
│   │
│   └── webapp/                 # Next.js Frontend
│       ├── src/
│       │   ├── app/            # Next.js pages (App Router)
│       │   │   ├── dashboard/  # Protected dashboard
│       │   │   └── callback/   # OAuth callback
│       │   ├── components/     # React components
│       │   └── lib/            # Utilities & hooks
│       └── tailwind.config.js
│
├── SETUP.md                    # Detailed setup guide
├── nx.json                     # Nx configuration
└── package.json
```

## 🗄️ Database Schema

### Users
- Stores Tesla OAuth tokens (encrypted)
- User profile information

### Vehicles
- Vehicle details (VIN, model, name)
- Telemetry configuration status

### Telegram Configs
- Link tokens for deep linking
- Chat IDs for sending alerts

## 🔐 Security

- **Token Encryption**: All Tesla access tokens are encrypted before storage
- **Secure Communication**: HTTPS only in production
- **Rate Limiting**: API endpoints are rate-limited
- **OAuth 2.0**: Secure authentication flow with Tesla
- **No Plaintext Secrets**: All sensitive data encrypted

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

TeslaGuard is not affiliated with, endorsed by, or connected to Tesla, Inc. 
Tesla and the Tesla logo are trademarks of Tesla, Inc.

Use this software at your own risk. The authors are not responsible for any damage or issues that may arise from using this software.

## 🆘 Support

- **Documentation**: [SETUP.md](./SETUP.md)
- **API Docs**: [apps/api/README.md](./apps/api/README.md)
- **WebApp Docs**: [apps/webapp/README.md](./apps/webapp/README.md)

## 🙏 Acknowledgments

- Tesla for the Fleet API
- Telegram for the Bot API
- The Nx team for the amazing monorepo tools
- The NestJS and Next.js communities

---

Made with ❤️ for Tesla owners who care about their vehicle's security
