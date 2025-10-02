@echo off
REM Start Chroma DB using Docker on Windows
REM This script starts a local Chroma vector database instance

echo Starting Chroma DB on port 8000...

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not installed. Please install Docker first.
    echo Visit: https://www.docker.com/get-started
    exit /b 1
)

REM Create a persistent volume for Chroma data
docker volume create chroma-data >nul 2>&1

REM Stop any existing Chroma container
docker stop chroma-db >nul 2>&1
docker rm chroma-db >nul 2>&1

REM Start Chroma DB
echo Launching Chroma DB container...
docker run -d --name chroma-db -p 8000:8000 -v chroma-data:/chroma/chroma chromadb/chroma

REM Wait for Chroma to be ready
echo Waiting for Chroma to be ready...
timeout /t 5 /nobreak >nul

echo.
echo Chroma DB should now be running!
echo Running on http://localhost:8000
echo.
echo To stop Chroma: docker stop chroma-db
echo To view logs: docker logs chroma-db
echo To check status: docker ps

