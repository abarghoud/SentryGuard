#!/bin/bash
set -e

IMAGE_NAME="abarghoud/sentryguard-fleet-telemetry"
VERSION="${1:-latest}"
PLATFORMS="linux/amd64,linux/arm64"

echo "🔨 Building multi-platform Docker image: ${IMAGE_NAME}:${VERSION}"
echo "🏗️  Platforms: ${PLATFORMS}"

if ! docker buildx version > /dev/null 2>&1; then
    echo "❌ Docker Buildx is not available. Install Docker Desktop >= 2.2.0"
    exit 1
fi

BUILDER_NAME="sentryguard-builder"
if ! docker buildx inspect "${BUILDER_NAME}" > /dev/null 2>&1; then
    echo "🔧 Creating multi-platform builder..."
    docker buildx create --name "${BUILDER_NAME}" --driver docker-container --bootstrap
fi

docker buildx build \
    --builder "${BUILDER_NAME}" \
    --platform "${PLATFORMS}" \
    --tag "${IMAGE_NAME}:${VERSION}" \
    --push \
    .

echo "✅ Build and push completed successfully!"
echo ""
echo "🚀 To also tag as latest:"
echo "   docker buildx build --builder ${BUILDER_NAME} --platform ${PLATFORMS} --tag ${IMAGE_NAME}:latest --push ."