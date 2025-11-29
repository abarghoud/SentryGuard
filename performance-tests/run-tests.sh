#!/bin/bash

# Script de lancement des tests de performance TeslaGuard
# Utilisation: ./run-tests.sh [load|ramp] [duration]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K6_DIR="$SCRIPT_DIR/k6"

# Vérifier que k6 est installé
if ! command -v k6 &> /dev/null; then
    echo "❌ k6 n'est pas installé. Installez-le avec:"
    echo "   brew install k6"
    exit 1
fi

# Vérifier que les certificats existent
if [ ! -f "$K6_DIR/test-certs/vehicle_device.VIN-1.cert" ] || [ ! -f "$K6_DIR/test-certs/vehicle_device.VIN-1.key" ]; then
    echo "❌ Certificats manquants dans $K6_DIR/test-certs/"
    echo "   Copiez vos certificats mTLS (voir $K6_DIR/test-certs/README.md)"
    exit 1
fi

# Vérifier que les données de test existent
if [ ! -f "$K6_DIR/data/valid-test-data.json" ]; then
    echo "❌ Données de test manquantes: $K6_DIR/data/valid-test-data.json"
    exit 1
fi

# Paramètres par défaut
TEST_TYPE="${1:-load}"
DURATION="${2:-5m}"
FLEET_URL="${FLEET_URL:-wss://ws.sentryguard.org:12345/}"

# Valider le type de test
case $TEST_TYPE in
    load)
        SCRIPT="$K6_DIR/load-test.js"
        ;;
    ramp)
        SCRIPT="$K6_DIR/ramp-test.js"
        ;;
    *)
        echo "❌ Type de test invalide: $TEST_TYPE"
        echo "   Utilisez 'load' ou 'ramp'"
        exit 1
        ;;
esac

# Afficher la configuration
echo ""
echo "🚀 LANCEMENT DES TESTS DE PERFORMANCE"
echo "====================================="
echo "Type de test: $TEST_TYPE"
echo "Script: $SCRIPT"
echo "Durée: $DURATION"
echo "URL: $FLEET_URL"
echo ""

# Variables d'environnement pour k6
export FLEET_URL="$FLEET_URL"
export DURATION="$DURATION"

# Lancer le test
echo "▶️  Démarrage de k6..."
echo ""

k6 run "$SCRIPT"

echo ""
echo "✅ Test terminé"
echo "📊 Consultez les résultats ci-dessus"
echo "📝 Surveillez les logs du serveur pour les métriques [LATENCY]"
