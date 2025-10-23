#!/bin/bash
# CS720 Setup Script for Unix/Mac/Linux
# Run with: chmod +x setup.sh && ./setup.sh

set -e  # Exit on any error

echo ""
echo "========================================"
echo "  CS720 Customer Intelligence Platform"
echo "  Automated Setup Script"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found!"
    echo "Please install Node.js 20+ from https://nodejs.org/"
    echo "Then run this script again."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the CS720 root directory"
    exit 1
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo "✅ Dependencies installed successfully"

# Set up environment file
echo ""
echo "🔧 Setting up environment configuration..."
if [ ! -f "backend/.env" ]; then
    cp "backend/.env.example" "backend/.env"
    echo "✅ Created backend/.env file"
else
    echo "⚠️  backend/.env already exists, skipping copy"
fi

# Check if Ollama is available
echo ""
echo "🤖 Checking for Ollama (Local AI)..."
if command -v ollama &> /dev/null; then
    echo "✅ Ollama found"
    echo "Starting Ollama service..."

    # Start Ollama in background if not already running
    if ! pgrep -f "ollama serve" > /dev/null; then
        ollama serve &
        sleep 3
    fi

    echo "Downloading AI model (this may take a few minutes)..."
    ollama pull llama2:7b-chat
    echo "✅ Local AI model ready"
else
    echo "⚠️  Ollama not found"
    echo "To install Ollama for local AI:"
    echo ""

    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "  # macOS:"
        echo "  brew install ollama"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "  # Linux:"
        echo "  curl -fsSL https://ollama.ai/install.sh | sh"
    fi

    echo "  ollama serve &"
    echo "  ollama pull llama2:7b-chat"
    echo ""
    echo "You can continue without Ollama, but local AI won't work."
fi

echo ""
echo "========================================"
echo "  Setup Complete! 🎉"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your OAuth credentials"
echo "2. See SETUP.md for detailed OAuth setup instructions"
echo "3. Run: npm run dev"
echo "4. Open: http://localhost:3000"
echo ""
echo "For help, see SETUP.md or the troubleshooting section."
echo ""