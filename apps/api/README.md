# TeslaGuard API

Serveur API pour la gestion des alertes Tesla via ZMQ et notifications Telegram.

## Fonctionnalités

- 🔌 **Écoute ZMQ** : Réception des messages de télémétrie via ZMQ sur `tcp://10.0.2.12:5284`
- 📱 **Notifications Telegram** : Envoi automatique d'alertes Sentry via Telegram
- 🚗 **Configuration Télémétrie** : API pour configurer la télémétrie des véhicules Tesla
- 🔍 **Monitoring** : Logs détaillés des connexions et messages

## Architecture

### Services

- **ZmqService** : Écoute les messages ZMQ et traite les alertes Sentry
- **TelegramService** : Envoie les notifications Telegram formatées
- **TelemetryConfigService** : Gère la configuration de télémétrie Tesla
- **TelemetryService** : Traite les données de télémétrie

### Endpoints API

- `GET /telemetry-config/vehicles` - Liste des véhicules
- `POST /telemetry-config/configure-all` - Configuration pour tous les véhicules
- `POST /telemetry-config/configure/:vin` - Configuration pour un véhicule spécifique
- `GET /telemetry-config/check/:vin` - Vérification de la configuration

## Configuration

Copiez `env.example` vers `.env` et configurez :

```bash
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Tesla API
ACCESS_TOKEN=your_tesla_access_token
LETS_ENCRYPT_CERTIFICATE=your_base64_certificate

# ZMQ
ZMQ_ENDPOINT=tcp://10.0.2.12:5284
```

## Installation

```bash
npm install
# ou
yarn install
```

## Démarrage

```bash
npm run start
# ou
yarn start
```

## Format des messages ZMQ

Le service attend des messages JSON au format :

```json
{
  "data": [
    {
      "key": "SentryMode",
      "value": {
        "stringValue": "Aware"
      }
    },
    {
      "key": "CenterDisplay", 
      "value": {
        "displayStateValue": "DisplayStateSentry"
      }
    }
  ],
  "createdAt": "2025-10-21T21:02:20.597791201Z",
  "vin": "XP7YGCERXSB724742",
  "isResend": false
}
```

## Alertes Sentry

Quand `SentryMode` est à `"Aware"`, une notification Telegram est automatiquement envoyée avec :

- VIN du véhicule
- Timestamp de l'alerte
- État du mode Sentry
- État de l'affichage central
- Informations de localisation (si disponibles)

## Logs

Le service log toutes les activités :
- Connexions ZMQ
- Messages reçus
- Alertes traitées
- Notifications envoyées
- Erreurs de configuration
