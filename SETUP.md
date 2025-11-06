# SentryGuard - Guide de Setup Complet

Ce guide vous accompagne dans la configuration complète de SentryGuard avec la nouvelle webapp Next.js SEO-friendly.

## 📋 Prérequis

- Node.js 18+ et Yarn
- PostgreSQL 14+
- Un compte Tesla Developer avec OAuth configuré
- Un bot Telegram (créé via @BotFather)

## 🗄️ Configuration de la Base de Données

### 1. Installation de PostgreSQL

```bash
# macOS (Homebrew)
brew install postgresql@14
brew services start postgresql@14

# Linux (Ubuntu/Debian)
sudo apt-get install postgresql-14
sudo systemctl start postgresql

# Vérifier que PostgreSQL fonctionne
psql --version
```

### 2. Créer la base de données

```bash
# Se connecter à PostgreSQL
psql postgres

# Créer l'utilisateur et la base de données
CREATE USER sentryguard WITH PASSWORD 'your_secure_password';
CREATE DATABASE sentryguard OWNER sentryguard;

# Donner les permissions
GRANT ALL PRIVILEGES ON DATABASE sentryguard TO sentryguard;

# Quitter
\q
```

### 3. Vérifier la connexion

```bash
psql -U sentryguard -d sentryguard -h localhost
# Si la connexion réussit, tapez \q pour quitter
```

## 🔧 Configuration de l'API Backend

### 1. Variables d'environnement

Créez un fichier `apps/api/.env` basé sur `apps/api/env.example` :

```env
# Configuration SentryGuard API
PORT=3000
WEBAPP_URL=http://localhost:4200

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=sentryguard
DATABASE_PASSWORD=your_secure_password
DATABASE_NAME=sentryguard
DATABASE_LOGGING=false

# Security
ENCRYPTION_KEY=your_encryption_key_here_min_32_chars_generate_with_crypto

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_BOT_USERNAME=your_bot_username

# Tesla OAuth Configuration
TESLA_CLIENT_ID=your_tesla_client_id
TESLA_CLIENT_SECRET=your_tesla_client_secret
TESLA_AUDIENCE=https://fleet-api.prd.eu.vn.cloud.tesla.com
TESLA_REDIRECT_URI=https://sentryguard.org/callback/auth

# Tesla API Configuration (Legacy - pour compatibilité)
ACCESS_TOKEN=optional_legacy_token
LETS_ENCRYPT_CERTIFICATE=your_base64_encoded_certificate

# ZMQ Configuration
ZMQ_ENDPOINT=tcp://10.0.2.12:5284

DEBUG_MESSAGES=true

# Environment
NODE_ENV=development

# Rate Limiting (requests per minute per IP)
THROTTLE_TTL=60000
THROTTLE_LIMIT=20
```

### 2. Générer une clé de chiffrement sécurisée

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copiez le résultat dans ENCRYPTION_KEY
```

## 🤖 Configuration du Bot Telegram

### 1. Créer un bot

1. Ouvrez Telegram et cherchez @BotFather
2. Envoyez `/newbot`
3. Suivez les instructions pour nommer votre bot
4. Copiez le token fourni dans `TELEGRAM_BOT_TOKEN`
5. Notez le username du bot (ex: @SentryGuardBot) dans `TELEGRAM_BOT_USERNAME`

### 2. Configurer le bot

```bash
# Envoyer à @BotFather :
/setdescription @YourBotUsername
# Entrez : "Receive real-time alerts from your Tesla vehicle"

/setabouttext @YourBotUsername
# Entrez : "SentryGuard Bot - Tesla Vehicle Security Monitoring"

/setcommands @YourBotUsername
# Entrez :
start - Link your SentryGuard account
status - Check connection status
help - Show available commands
```

## 🚗 Configuration Tesla Developer

### 1. Créer une application Tesla

1. Allez sur https://developer.tesla.com
2. Créez une nouvelle application
3. Configurez l'URI de redirection : `https://sentryguard.org/callback/auth` (ou votre domaine)
4. Copiez le Client ID et Client Secret dans votre `.env`

### 2. Configurer les scopes

Assurez-vous que votre application a les scopes suivants :

- `openid`
- `vehicle_device_data`
- `offline_access`
- `user_data`

## 🌐 Configuration de la WebApp

### 1. Variables d'environnement

Créez un fichier `apps/webapp/.env.local` :

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Pour la production, utilisez votre URL d'API complète :

```env
NEXT_PUBLIC_API_URL=https://api.sentryguard.org
```

## 🚀 Démarrage de l'Application

### 1. Installation des dépendances

```bash
# À la racine du projet
yarn install
```

### 2. Démarrer la base de données

```bash
# Vérifier que PostgreSQL tourne
brew services list | grep postgresql
# ou
sudo systemctl status postgresql
```

### 3. Démarrer l'API Backend

```bash
# Dans un terminal
npx nx serve api

# L'API démarre sur http://localhost:3001
# Le bot Telegram démarre automatiquement
```

### 4. Démarrer la WebApp

```bash
# Dans un autre terminal
npx nx serve webapp

# La webapp démarre sur http://localhost:4200
```

## 📊 Vérification de l'Installation

### 1. Vérifier l'API

```bash
curl http://localhost:3001/auth/stats
# Devrait retourner : {"activeUsers":0,"pendingStates":0}
```

### 2. Vérifier la base de données

```bash
psql -U sentryguard -d sentryguard -h localhost

# Dans psql, vérifier les tables :
\dt

# Vous devriez voir :
# - users
# - vehicles
# - telegram_configs
```

### 3. Vérifier le bot Telegram

1. Cherchez votre bot dans Telegram
2. Envoyez `/start`
3. Vous devriez recevoir un message de bienvenue

## 🔄 Flow Complet de l'Application

### 1. Authentification Tesla

1. Allez sur http://localhost:4200
2. Cliquez sur "Login with Tesla"
3. Authentifiez-vous avec votre compte Tesla
4. Vous êtes redirigé vers `/callback` puis vers `/dashboard`

### 2. Synchronisation des Véhicules

1. Dans le dashboard, allez sur "Vehicles"
2. Cliquez sur "Refresh" pour synchroniser vos véhicules
3. Activez la télémétrie pour chaque véhicule

### 3. Configuration Telegram

1. Allez sur "Telegram" dans le dashboard
2. Cliquez sur "Generate Telegram Link"
3. Cliquez sur le lien pour ouvrir Telegram
4. Le bot s'ouvre automatiquement avec `/start TOKEN`
5. Retournez sur la webapp - le statut passe à "Linked"
6. Testez avec "Send Test Message"

## 🛠️ Commandes Utiles

### Build pour la production

```bash
# API
npx nx build api

# WebApp
npx nx build webapp
```

### Linting

```bash
# Linter l'API
npx nx lint api

# Linter la WebApp
npx nx lint webapp
```

### Tests

```bash
# Tests de l'API
npx nx test api

# Tests de la WebApp
npx nx test webapp
```

### Base de données

```bash
# Réinitialiser complètement la base de données
psql -U sentryguard -d sentryguard -h localhost

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO sentryguard;
\q

# Redémarrer l'API pour recréer les tables (synchronize: true en dev)
npx nx serve api
```

## 🐛 Dépannage

### L'API ne démarre pas

1. Vérifiez que PostgreSQL est lancé
2. Vérifiez les credentials dans `.env`
3. Regardez les logs : `npx nx serve api --verbose`

### Le bot Telegram ne répond pas

1. Vérifiez `TELEGRAM_BOT_TOKEN` dans `.env`
2. Vérifiez que l'API est démarrée
3. Testez avec BotFather : `/mybots` → votre bot → "API Token"

### Erreur de connexion à la base de données

```bash
# Vérifier que PostgreSQL accepte les connexions
psql -U sentryguard -d sentryguard -h localhost

# Si erreur "role does not exist", recréer l'utilisateur
sudo -u postgres psql
CREATE USER sentryguard WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE sentryguard TO sentryguard;
```

### La webapp ne se connecte pas à l'API

1. Vérifiez `NEXT_PUBLIC_API_URL` dans `.env.local`
2. Vérifiez que l'API tourne sur le bon port
3. Regardez la console du navigateur pour les erreurs CORS

## 📦 Déploiement en Production

### API Backend

```bash
# Build
npx nx build api

# Les fichiers sont dans apps/api/dist/
# Déployez avec PM2, Docker, ou votre solution préférée

# Exemple PM2
pm2 start apps/api/dist/main.js --name "sentryguard-api"
```

### WebApp

```bash
# Build
npx nx build webapp

# Les fichiers sont dans apps/webapp/dist/
# Déployez sur Vercel, Netlify, ou votre hébergeur

# Exemple Vercel
cd apps/webapp
vercel deploy --prod
```

### Variables d'environnement de production

N'oubliez pas de mettre à jour :

- `WEBAPP_URL` → URL de votre webapp en production
- `TESLA_REDIRECT_URI` → URL de callback en production
- `NEXT_PUBLIC_API_URL` → URL de votre API en production
- `DATABASE_*` → Credentials de votre DB de production
- `NODE_ENV=production`
- `DATABASE_LOGGING=false`

## 📚 Documentation

- [API README](./apps/api/README.md)
- [WebApp README](./apps/webapp/README.md)
- [Architecture Plan](./sentryguard-seo-webapp.plan.md)

## 🆘 Support

Si vous rencontrez des problèmes, vérifiez :

1. Que toutes les dépendances sont installées (`yarn install`)
2. Que PostgreSQL tourne et est accessible
3. Que tous les fichiers `.env` sont configurés
4. Les logs de l'API et de la webapp

Bon déploiement ! 🚀
