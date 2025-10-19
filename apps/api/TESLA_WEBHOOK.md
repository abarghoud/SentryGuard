# 🚨 TeslaGuard API - WebSocket Tesla Télémétrie

## 📡 Configuration WebSocket

### **WebSocket Tesla Télémétrie**
```
WS / (WebSocket sur le chemin racine)
```
**Description :** WebSocket pour recevoir la télémétrie en temps réel de Tesla Fleet Telemetry.

### **Endpoint Sentinel (Legacy)**
```
POST /api/sentry/alert
```
**Description :** Endpoint dédié aux alertes du mode Sentinel Tesla (webhook legacy).

**Headers requis :**
- `Content-Type: application/json`
- `x-tesla-signature: [signature]` (optionnel mais recommandé)

**Exemple de payload :**
```json
{
  "vin": "5YJ3E1EA4KF123456",
  "timestamp": "2024-01-15T10:30:00Z",
  "SentryMode": true,
  "AlarmState": "active",
  "Location": {
    "latitude": 48.8566,
    "longitude": 2.3522
  },
  "Soc": 85,
  "VehicleSpeed": 0
}
```

## 🔧 Configuration Tesla Fleet Telemetry

### **Configuration WebSocket pour télémétrie temps réel**
```json
{
  "vins": ["VIN_DU_VEHICULE"],
  "config": {
    "hostname": "votre-domaine.com",
    "port": 443,
    "ca": "votre_certificat_ssl_complet",
    "fields": {
      "SentryMode": { "interval_seconds": 1 },
      "AlarmState": { "interval_seconds": 1 },
      "Location": { "interval_seconds": 10 },
      "Soc": { "interval_seconds": 30 }
    }
  }
}
```

### **URLs de configuration**
- **WebSocket Tesla :** `wss://votre-domaine.com/` (télémétrie temps réel)
- **Webhook Sentinel :** `https://votre-domaine.com/api/sentry/alert` (legacy)

## 📱 Configuration Telegram

### **Variables d'environnement**
Créez un fichier `.env` dans le dossier `apps/api/` :

```bash
# Configuration TeslaGuard API
PORT=3000

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here

# Tesla Webhook Security
TESLA_WEBHOOK_SECRET=your_webhook_secret_here

# Environment
NODE_ENV=development
```

### **Créer un bot Telegram**
1. Parlez à [@BotFather](https://t.me/botfather) sur Telegram
2. Créez un nouveau bot avec `/newbot`
3. Récupérez le token du bot
4. Obtenez votre chat ID en envoyant un message à [@userinfobot](https://t.me/userinfobot)

## 🚀 Démarrage de l'API

### **Installation des dépendances**
```bash
yarn install
```

### **Configuration de l'environnement**
```bash
cp apps/api/env.example apps/api/.env
# Éditez le fichier .env avec vos vraies valeurs
```

### **Lancement en développement**
```bash
yarn nx serve api
```

### **Lancement en production**
```bash
yarn nx build api
yarn nx start:prod api
```

## 📊 Structure des Données Sentinel

### **Alerte Sentinel**
```typescript
interface SentryAlert {
  vin: string;
  timestamp: string;
  location?: string;
  batteryLevel?: number;
  vehicleSpeed?: number;
  alarmState?: string;
  sentryMode?: boolean;
  rawData: any;
}
```

## 🔒 Sécurité

### **Vérification de signature**
L'API vérifie automatiquement la signature Tesla (si fournie) pour s'assurer de l'authenticité des données.

### **HTTPS requis**
Tesla exige HTTPS pour les webhooks. Assurez-vous d'avoir un certificat SSL valide.

## 📝 Logs

L'API génère des logs détaillés :
- `🚨` Alerte Sentinel détectée
- `📱` Notification Telegram envoyée
- `✅` Traitement réussi
- `❌` Erreurs

## 🧪 Test des Endpoints

### **Test WebSocket avec wscat**
```bash
# Installer wscat si nécessaire
npm install -g wscat

# Se connecter au WebSocket
wscat -c ws://localhost:3000/

# Envoyer un message de test
{"vin": "TEST123", "SentryMode": true, "AlarmState": "active"}
```

### **Test de l'endpoint Sentinel (legacy)**
```bash
# Test de l'endpoint Sentinel
curl -X POST http://localhost:3000/api/sentry/alert \
  -H "Content-Type: application/json" \
  -d '{
    "vin": "TEST123",
    "timestamp": "2024-01-15T10:30:00Z",
    "SentryMode": true,
    "AlarmState": "active",
    "Location": {
      "latitude": 48.8566,
      "longitude": 2.3522
    },
    "Soc": 85
  }'
```

## 🎯 Fonctionnement

### **WebSocket (Recommandé)**
1. **Quelqu'un touche votre Tesla** 🚗
2. **Mode Sentinel se déclenche** 🚨
3. **Tesla envoie la télémétrie** → `WS /` (temps réel)
4. **Filtrage automatique** des alertes Sentinel
5. **Notification Telegram immédiate** 📱
6. **Vous êtes alerté en temps réel** ⚡

### **Webhook (Legacy)**
1. **Quelqu'un touche votre Tesla** 🚗
2. **Mode Sentinel se déclenche** 🚨
3. **Tesla envoie l'alerte** → `POST /api/sentry/alert`
4. **Notification Telegram immédiate** 📱
5. **Vous êtes alerté en temps réel** ⚡

## 🎯 Prochaines Étapes

1. **Configurer votre domaine** avec HTTPS/WSS
2. **Créer un bot Telegram** et configurer les variables d'environnement
3. **Configurer Tesla Fleet Telemetry** avec votre domaine (WebSocket recommandé)
4. **Tester** avec votre véhicule Tesla
5. **Surveiller** les logs pour vérifier la réception des alertes

---

**TeslaGuard** - Protection de votre Tesla avec des notifications Sentinel en temps réel ! 🚗🔒🚨