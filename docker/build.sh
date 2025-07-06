#!/bin/bash
# Build script for Pentriarch AI Kali Scanner Container

set -e

# Configuration
IMAGE_NAME="pentriarch/kali-scanner"
IMAGE_TAG="latest"
DOCKERFILE="Dockerfile.kali"

echo "🛡️  Building Pentriarch AI Kali Scanner Container..."
echo "📦 Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "📄 Dockerfile: ${DOCKERFILE}"

# Build the image
docker build \
    -t "${IMAGE_NAME}:${IMAGE_TAG}" \
    -f "${DOCKERFILE}" \
    --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --build-arg VERSION="1.0.0" \
    .

echo "✅ Build completed successfully!"
echo "🔍 Image size: $(docker images ${IMAGE_NAME}:${IMAGE_TAG} --format "table {{.Size}}" | tail -n 1)"

# Test the container
echo "🧪 Testing container..."
docker run --rm "${IMAGE_NAME}:${IMAGE_TAG}" echo "Container test successful"

echo "🎉 Pentriarch AI Kali Scanner Container is ready!"
echo ""
echo "Usage:"
echo "  docker run -it ${IMAGE_NAME}:${IMAGE_TAG}"
echo "  docker run --rm ${IMAGE_NAME}:${IMAGE_TAG} nmap --help"
