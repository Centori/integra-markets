#!/bin/bash

# Integra Markets Enhanced Backend Startup Script

echo "🚀 Starting Integra Markets Enhanced Backend..."

# Kill any existing backend processes
echo "Stopping any existing backend processes..."
pkill -f "uvicorn.*main" || true
pkill -f "python.*main.py" || true
pkill -f "python.*main_enhanced.py" || true

# Wait for processes to stop
sleep 2

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

# Navigate to the project directory
PROJECT_DIR="$(dirname "$0")/.."
cd "$PROJECT_DIR"

# Activate virtual environment
if [ -d "venv" ]; then
    echo "🐍 Activating virtual environment..."
    source venv/bin/activate
else
    echo "❌ Virtual environment not found!"
    exit 1
fi

# Install/update requirements if needed
echo "📦 Checking dependencies..."
if [ -f "backend/requirements.txt" ]; then
    pip install -q -r backend/requirements.txt
fi

# Download NLTK data if needed
echo "📚 Ensuring NLTK data is available..."
python3 -c "import nltk; nltk.download('vader_lexicon', quiet=True); nltk.download('punkt', quiet=True); nltk.download('stopwords', quiet=True)" 2>/dev/null || true

# Start the enhanced backend
echo "🌟 Starting enhanced backend with NLP support..."
cd backend
python3 -m uvicorn main_enhanced:app --host 0.0.0.0 --port 8000 --reload

# Alternative: Run without uvicorn (using built-in server)
# python3 main_enhanced.py
