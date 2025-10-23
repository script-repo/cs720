@echo off
REM CS720 Setup Script for Windows
REM Run this script to automatically set up CS720

echo.
echo ========================================
echo   CS720 Customer Intelligence Platform
echo   Automated Setup Script
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found!
    echo Please install Node.js 20+ from https://nodejs.org/
    echo Then run this script again.
    pause
    exit /b 1
)

echo ✅ Node.js found:
node --version

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Please run this script from the CS720 root directory
    pause
    exit /b 1
)

echo.
echo 📦 Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Set up environment file
echo.
echo 🔧 Setting up environment configuration...
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env"
    echo ✅ Created backend/.env file
) else (
    echo ⚠️  backend/.env already exists, skipping copy
)

REM Check if Ollama is available
echo.
echo 🤖 Checking for Ollama (Local AI)...
where ollama >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ Ollama found
    echo Starting Ollama service...
    start /B ollama serve
    timeout /t 3 /nobreak >nul
    echo Downloading AI model (this may take a few minutes)...
    ollama pull llama2:7b-chat
    echo ✅ Local AI model ready
) else (
    echo ⚠️  Ollama not found
    echo To install Ollama for local AI:
    echo   1. Run: winget install Ollama.Ollama
    echo   2. Then run: ollama serve
    echo   3. Then run: ollama pull llama2:7b-chat
    echo.
    echo You can continue without Ollama, but local AI won't work.
)

echo.
echo ========================================
echo   Setup Complete! 🎉
echo ========================================
echo.
echo Next steps:
echo 1. Edit backend/.env with your OAuth credentials
echo 2. See SETUP.md for detailed OAuth setup instructions
echo 3. Run: npm run dev
echo 4. Open: http://localhost:3000
echo.
echo For help, see SETUP.md or the troubleshooting section.
echo.
pause