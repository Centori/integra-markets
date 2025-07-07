#!/bin/bash
# Development Environment Setup Script for Integra Markets
# This script ensures all developers have consistent environments

set -e

echo "===== Setting up Integra Markets Development Environment ====="

# Create and activate Python virtual environment
echo "Setting up Python environment..."
if [ ! -d "pyenv" ]; then
    python -m venv pyenv
    echo "Virtual environment created"
fi

# Activate virtual environment
source pyenv/bin/activate

# Install Python dependencies using uv for faster installation
echo "Installing Python dependencies..."
./scripts/setup_uv.sh
uv pip install -r requirements.txt

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
cd app
npm install
cd ..

# Check for required tools
echo "Checking for required tools..."
command -v python3 >/dev/null 2>&1 || { echo "Python3 is required but not installed. Aborting."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required but not installed. Aborting."; exit 1; }

# Setup pre-commit hooks
echo "Setting up pre-commit hooks..."
if [ ! -f ".git/hooks/pre-commit" ]; then
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
set -e

echo "Running pre-commit checks..."

# Run linters
echo "Running Python linters..."
flake8 app/ tests/

echo "Running JavaScript linters..."
cd app
npm run lint
cd ..

# Run tests
echo "Running tests..."
pytest tests/ -v

echo "Pre-commit checks passed!"
EOF
    chmod +x .git/hooks/pre-commit
    echo "Pre-commit hook installed"
fi

# Setup environment variables
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo ".env file created. Please update it with your local settings."
fi

echo "===== Development environment setup complete ====="
echo "To start the API server: ./scripts/start_api.sh"
echo "To start the React Native app: cd app && npx expo start --ios"