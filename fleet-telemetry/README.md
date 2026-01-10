# Fleet Telemetry Docker Image

Image Docker personnalisée pour déployer `fleet-telemetry` sans volumes, en utilisant des variables d'environnement base64. Basée sur Ubuntu 22.04 pour la compatibilité avec les binaires compilés avec glibc.

## Build de l'image

L'image est construite pour les architectures **amd64** et **arm64** via Docker Buildx.

### Prérequis

- Docker Desktop >= 2.2.0 (Buildx inclus) ou Docker Engine avec le plugin Buildx
- Être connecté à Docker Hub : `docker login`

### Option 1 : Utiliser le script

Le script crée automatiquement un builder multi-plateforme (`sentryguard-builder`) s'il n'existe pas, puis build et push les deux architectures en une seule commande.

```bash
# Build et push avec le tag latest
./build.sh

# Build et push avec une version spécifique
./build.sh v1.0.0
```

### Option 2 : Commandes Docker manuelles

```bash
# Créer un builder multi-plateforme (une seule fois)
docker buildx create --name sentryguard-builder --driver docker-container --bootstrap

# Build et push pour amd64 et arm64
docker buildx build \
  --builder sentryguard-builder \
  --platform linux/amd64,linux/arm64 \
  --tag abarghoud/sentryguard-fleet-telemetry:latest \
  --push \
  .
```

> **Note :** `--push` est obligatoire pour les builds multi-arch. Docker ne peut pas charger une image multi-plateforme dans le daemon local avec `--load`.

## Test en local

Avant de push l'image sur Docker Hub, vous pouvez la tester localement :

### Option 1 : Utiliser le script de test

1. **Encoder vos fichiers en base64** et définir les variables d'environnement :
   ```bash
   export FLEET_TELEMETRY_CONFIG_B64=$(cat config.json | base64 | tr -d '\n')
   export FLEET_TELEMETRY_SERVER_CERT_B64=$(cat fullchain.pem | base64 | tr -d '\n')
   export FLEET_TELEMETRY_SERVER_KEY_B64=$(cat privkey.pem | base64 | tr -d '\n')
   
   # Optionnel
   export FLEET_TELEMETRY_CA_FILE_B64=$(cat test-vehicles-ca.crt | base64 | tr -d '\n')
   ```

2. **Lancer le test** :
   ```bash
   ./test.sh
   ```

Le script va :
- Vérifier que les variables d'environnement sont définies
- Builder l'image si elle n'existe pas
- Lancer le conteneur avec les bonnes variables et ports

### Option 2 : Test manuel avec Docker

1. **Builder l'image** :
   ```bash
   ./build.sh
   ```

2. **Encoder vos fichiers** (voir section "Encoder vos fichiers en base64")

3. **Lancer le conteneur** :
   ```bash
   docker run --rm -it \
     -e FLEET_TELEMETRY_CONFIG_B64="<votre_config_base64>" \
     -e FLEET_TELEMETRY_SERVER_CERT_B64="<votre_cert_base64>" \
     -e FLEET_TELEMETRY_SERVER_KEY_B64="<votre_key_base64>" \
     -e FLEET_TELEMETRY_CA_FILE_B64="<votre_ca_base64>" \
     -p 12345:12345 \
     -p 29090:9090 \
     abarghoud/sentryguard-fleet-telemetry:latest
   ```

4. **Vérifier les logs** : Le conteneur devrait afficher les messages de décodage et démarrer fleet-telemetry

5. **Arrêter le conteneur** : Appuyez sur `Ctrl+C`

## Push vers Docker Hub

Le push est intégré directement dans le build via `--push`. Il suffit d'être connecté avant de lancer `build.sh` :

```bash
docker login
./build.sh v1.0.0
```

## Déploiement avec Coolify

### Variables d'environnement requises

Dans Coolify, configurez les variables d'environnement suivantes :

#### Requis :
- `FLEET_TELEMETRY_CONFIG_B64` : Configuration JSON encodée en base64
- `FLEET_TELEMETRY_SERVER_CERT_B64` : Certificat serveur (fullchain.pem) encodé en base64
- `FLEET_TELEMETRY_SERVER_KEY_B64` : Clé privée serveur (privkey.pem) encodée en base64
- `FLEET_TELEMETRY_CA_FILE_B64` : Fichier CA (test-vehicles-ca.crt) encodé en base64

### Encoder vos fichiers en base64

```bash
# Encoder le fichier de configuration
cat config.json | base64 -w 0

# Encoder le certificat
cat fullchain.pem | base64 -w 0

# Encoder la clé privée
cat privkey.pem | base64 -w 0

# Encoder le fichier CA (si nécessaire)
cat test-vehicles-ca.crt | base64 -w 0
```

**Note macOS** : Utilisez `base64` sans `-w 0` (ou `base64 | tr -d '\n'` pour supprimer les retours à la ligne)

### Configuration dans Coolify

1. Créez une nouvelle application dans Coolify
2. Sélectionnez l'image : `abarghoud/sentryguard-fleet-telemetry:latest` (ou la version de votre choix)
3. Ajoutez les variables d'environnement listées ci-dessus
4. Configurez les ports :
   - `12345:12345`
   - `29090:9090`
5. Déployez !

## Sécurité

L'image Docker utilise les meilleures pratiques de sécurité :

- **Utilisateur non-root** : Le conteneur s'exécute avec un utilisateur dédié `fleetuser`
- **Permissions minimales** : Seuls les fichiers nécessaires ont les permissions d'exécution
- **Image de base Ubuntu 22.04** : Image LTS stable avec glibc pour la compatibilité binaire
- **Health check intégré** : Vérification automatique de la santé du service

## Structure des fichiers

```
fleet-telemetry/
├── Dockerfile          # Image Docker optimisée et sécurisée
├── .dockerignore       # Optimisation du contexte de build
├── entrypoint.sh       # Script shell qui décode les variables d'env et lance fleet-telemetry
├── build.sh            # Script pour builder l'image
└── README.md           # Ce fichier
```

## Configuration avancée de Coolify

### Variables d'environnement recommandées

En plus des variables requises, vous pouvez configurer :

```bash
# Configuration réseau
FLEET_TELEMETRY_HOST=0.0.0.0          # Écouter sur toutes les interfaces
FLEET_TELEMETRY_PORT=12345             # Port d'écoute (défaut: 443)

# Logs et debugging
FLEET_TELEMETRY_LOG_LEVEL=info         # Niveau de log (debug, info, warn, error)
FLEET_TELEMETRY_LOG_FORMAT=json        # Format des logs (json ou text)
```

### Health Checks dans Coolify

Configurez le health check dans Coolify :

- **Path** : `/health` (ou le endpoint que vous avez configuré)
- **Port** : `29090` (port de management)
- **Interval** : `30s`
- **Timeout** : `10s`

### Scaling horizontal

Pour déployer sur plusieurs serveurs :

1. **Load Balancer** : Configurez un load balancer (nginx, traefik, ou cloud LB)
2. **Session Affinity** : Si nécessaire, configurez l'affinité de session par IP
3. **Base de données partagée** : Si fleet-telemetry utilise une base de données, assurez-vous qu'elle soit accessible depuis tous les serveurs

### Monitoring

L'image inclut un health check intégré. Pour un monitoring avancé :

- **Métriques** : Configurez les métriques Prometheus si disponibles
- **Logs** : Centralisez les logs avec Loki ou ELK stack
- **Alertes** : Configurez des alertes sur les health checks
