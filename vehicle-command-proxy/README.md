# Vehicle Command Proxy Docker Image

Image Docker personnalisée pour déployer `vehicle-command` sans volumes, en utilisant des variables d'environnement base64. Basée sur Ubuntu 22.04 pour la compatibilité avec les binaires compilés avec glibc.

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
  --tag abarghoud/sentryguard-vehicle-command:latest \
  --push \
  .
```

> **Note :** `--push` est obligatoire pour les builds multi-arch. Docker ne peut pas charger une image multi-plateforme dans le daemon local avec `--load`.

## Test en local

Avant de push l'image sur Docker Hub, vous pouvez la tester localement :

### Prérequis

Vous devez avoir les fichiers suivants :
- `tls-key.pem` : Clé TLS pour la communication sécurisée
- `tls-cert.pem` : Certificat TLS
- `private-key.pem` : Clé privée pour signer les commandes

### Encoder vos fichiers en base64

```bash
# Encoder la clé TLS
export VEHICLE_COMMAND_TLS_KEY_B64=$(cat tls-key.pem | base64 | tr -d '\n')

# Encoder le certificat TLS
export VEHICLE_COMMAND_TLS_CERT_B64=$(cat tls-cert.pem | base64 | tr -d '\n')

# Encoder la clé privée
export VEHICLE_COMMAND_PRIVATE_KEY_B64=$(cat private-key.pem | base64 | tr -d '\n')
```

**Note macOS** : Sur macOS, `base64` n'a pas l'option `-w 0`, utilisez `tr -d '\n'` comme montré ci-dessus.

### Lancer le conteneur

```bash
docker run --rm -it \
  -e VEHICLE_COMMAND_TLS_KEY_B64="${VEHICLE_COMMAND_TLS_KEY_B64}" \
  -e VEHICLE_COMMAND_TLS_CERT_B64="${VEHICLE_COMMAND_TLS_CERT_B64}" \
  -e VEHICLE_COMMAND_PRIVATE_KEY_B64="${VEHICLE_COMMAND_PRIVATE_KEY_B64}" \
  -e VEHICLE_COMMAND_HOST="0.0.0.0" \
  -e VEHICLE_COMMAND_PORT="443" \
  -e VEHICLE_COMMAND_VERBOSE="true" \
  -p 443:443 \
  abarghoud/sentryguard-vehicle-command:latest
```

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
- `VEHICLE_COMMAND_TLS_KEY_B64` : Clé TLS encodée en base64
- `VEHICLE_COMMAND_TLS_CERT_B64` : Certificat TLS encodé en base64
- `VEHICLE_COMMAND_PRIVATE_KEY_B64` : Clé privée encodée en base64

#### Optionnels :
- `VEHICLE_COMMAND_HOST` : Adresse d'écoute (défaut: `0.0.0.0`)
- `VEHICLE_COMMAND_PORT` : Port d'écoute (défaut: `443`)
- `VEHICLE_COMMAND_VERBOSE` : Mode verbeux (défaut: `false`, mettre `true` ou `1` pour activer)

### Configuration dans Coolify

1. Créez une nouvelle application dans Coolify
2. Sélectionnez l'image : `abarghoud/sentryguard-vehicle-command:latest` (ou la version de votre choix)
3. Ajoutez les variables d'environnement listées ci-dessus
4. Configurez le port :
   - `443:443` (ou le port que vous avez défini dans `VEHICLE_COMMAND_PORT`)
5. Déployez !

## Sécurité

L'image Docker utilise les meilleures pratiques de sécurité :

- **Utilisateur non-root** : Le conteneur s'exécute avec un utilisateur dédié `vehicleuser`
- **Permissions minimales** : Seuls les fichiers nécessaires ont les permissions d'exécution
- **Image de base Ubuntu 22.04** : Image LTS stable avec glibc pour la compatibilité binaire
- **Health check intégré** : Vérification automatique de la santé du service
- **Build multi-stage** : Réduction de la taille de l'image et isolation des dépendances de build

## Structure des fichiers

```
vehicle-command-proxy/
├── Dockerfile          # Image Docker optimisée et sécurisée
├── .dockerignore       # Optimisation du contexte de build
├── entrypoint.sh       # Script shell qui décode les variables d'env et lance vehicle-command
├── build.sh            # Script pour builder l'image
└── README.md           # Ce fichier
```

## Utilisation avec docker-compose

Exemple de configuration docker-compose :

```yaml
vehicle-command:
  image: abarghoud/sentryguard-vehicle-command:latest
  container_name: tesla-vehicle-command
  restart: unless-stopped
  networks:
    - coolify
  environment:
    - VEHICLE_COMMAND_TLS_KEY_B64=${VEHICLE_COMMAND_TLS_KEY_B64}
    - VEHICLE_COMMAND_TLS_CERT_B64=${VEHICLE_COMMAND_TLS_CERT_B64}
    - VEHICLE_COMMAND_PRIVATE_KEY_B64=${VEHICLE_COMMAND_PRIVATE_KEY_B64}
    - VEHICLE_COMMAND_HOST=0.0.0.0
    - VEHICLE_COMMAND_PORT=443
    - VEHICLE_COMMAND_VERBOSE=true
  ports:
    - "443:443"
```

## Troubleshooting

### Le conteneur ne démarre pas

Vérifiez que toutes les variables d'environnement requises sont définies :
```bash
docker logs <container_id>
```

Vous devriez voir les messages suivants au démarrage :
```
✅ TLS key decoded
✅ TLS certificate decoded
✅ Private key decoded
🚀 Starting vehicle-command with args: [...]
```

### Erreur de décodage base64

Assurez-vous que vos fichiers sont correctement encodés sans retours à la ligne :
```bash
# Sur Linux
cat file.pem | base64 -w 0

# Sur macOS
cat file.pem | base64 | tr -d '\n'
```

### Le service ne répond pas

Vérifiez que :
- Le port est correctement mappé dans docker-compose ou dans la commande `docker run`
- Le firewall autorise les connexions sur le port configuré
- Les certificats TLS sont valides

## Architecture

L'image utilise un build multi-stage et multi-plateforme :

1. **Stage 1** : Extraction du binaire `tesla-http-proxy` depuis l'image officielle Tesla pour la plateforme cible
2. **Stage 2** : Image finale Ubuntu 22.04 pour la plateforme cible, avec le binaire et le script entrypoint

Cette approche produit une image native pour chaque architecture (amd64, arm64), sans émulation à l'exécution.