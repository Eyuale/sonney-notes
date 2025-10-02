#!/bin/bash
# Start Chroma DB using Docker
# This script starts a local Chroma vector database instance

echo "Starting Chroma DB on port 8000..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    echo "Visit: https://www.docker.com/get-started"
    exit 1
fi

# Check if port 8000 is already in use
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Warning: Port 8000 is already in use."
    echo "Chroma might already be running, or another service is using this port."
    read -p "Do you want to stop any existing Chroma container and restart? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker stop chroma-db 2>/dev/null
        docker rm chroma-db 2>/dev/null
    else
        exit 0
    fi
fi

# Create a persistent volume for Chroma data
docker volume create chroma-data 2>/dev/null

# Start Chroma DB
echo "Launching Chroma DB container..."
docker run -d \
  --name chroma-db \
  -p 8000:8000 \
  -v chroma-data:/chroma/chroma \
  chromadb/chroma

# Wait for Chroma to be ready
echo "Waiting for Chroma to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
        echo "✓ Chroma DB is ready!"
        echo "✓ Running on http://localhost:8000"
        echo ""
        echo "To stop Chroma: docker stop chroma-db"
        echo "To view logs: docker logs chroma-db"
        exit 0
    fi
    sleep 1
done

echo "Error: Chroma failed to start within 30 seconds"
echo "Check logs with: docker logs chroma-db"
exit 1

