#!/bin/bash

echo "🧹 Starting cleanup of Integra Markets project..."
echo "This will free up approximately 3GB+ of space"
echo ""

# Calculate initial size
INITIAL_SIZE=$(du -sh . 2>/dev/null | cut -f1)
echo "Initial project size: $INITIAL_SIZE"
echo ""

# Clean iOS build artifacts (2.4GB)
if [ -d "ios/build" ]; then
    echo "✅ Removing iOS build cache (2.4GB)..."
    rm -rf ios/build
fi

# Clean old simulator builds and archives (40MB+)
echo "✅ Removing old build archives..."
rm -f build26_simulator.tar.gz build-26-simulator.tar.gz
rm -f integra-markets-snack.zip
rm -rf IntegraMarkets.app

# Clean Expo cache
if [ -d ".expo" ]; then
    echo "✅ Cleaning Expo cache..."
    rm -rf .expo
fi

# Clean distribution folder
if [ -d "dist" ]; then
    echo "✅ Removing dist folder..."
    rm -rf dist
fi

# Clean Python virtual environment (can be recreated)
if [ -d "venv" ]; then
    echo "✅ Removing Python virtual environment (279MB)..."
    echo "   (Run 'python3 -m venv venv' to recreate later)"
    rm -rf venv
fi

# Optional: Clean node_modules (can be reinstalled)
read -p "❓ Remove node_modules (628MB)? Will need 'npm install' to restore [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "✅ Removing node_modules..."
    rm -rf node_modules
    rm -rf app/node_modules
    rm -rf integra-markets-snack/node_modules
fi

# Clean iOS DerivedData (if exists)
echo "✅ Cleaning iOS DerivedData..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*integra* 2>/dev/null

# Clean CocoaPods cache
echo "✅ Cleaning CocoaPods cache..."
cd ios && pod cache clean --all 2>/dev/null
cd ..

# Calculate final size
echo ""
FINAL_SIZE=$(du -sh . 2>/dev/null | cut -f1)
echo "✅ Cleanup complete!"
echo "Final project size: $FINAL_SIZE"
echo ""
echo "🎉 Space freed! Remember to run these if needed:"
echo "   - 'npm install' to restore node_modules"
echo "   - 'python3 -m venv venv' to recreate Python environment"
echo "   - 'cd ios && pod install' to restore iOS dependencies"
