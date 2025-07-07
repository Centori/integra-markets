#!/bin/bash
# iOS Simulator Launch Script for Integra Markets
# This script helps launch the iOS simulator with proper error handling

set -e

echo "🚀 Starting Integra Markets iOS Simulator..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the app directory."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if iOS Simulator is available
if ! command -v xcrun &> /dev/null; then
    echo "❌ Error: Xcode command line tools not found. Please install Xcode."
    exit 1
fi

# Check for available iOS simulators
echo "📱 Checking available iOS simulators..."
AVAILABLE_SIMULATORS=$(xcrun simctl list devices available | grep iPhone | head -5)
if [ -z "$AVAILABLE_SIMULATORS" ]; then
    echo "❌ Error: No iOS simulators found. Please install Xcode and iOS Simulator."
    exit 1
fi

echo "✅ Found iOS simulators:"
echo "$AVAILABLE_SIMULATORS"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

# Check if a simulator is already running
RUNNING_SIMULATOR=$(xcrun simctl list devices | grep "Booted" | head -1)
if [ -n "$RUNNING_SIMULATOR" ]; then
    echo "✅ iOS Simulator already running: $RUNNING_SIMULATOR"
else
    echo "🔄 Starting iOS Simulator..."
    # Start the first available iPhone simulator
    FIRST_IPHONE=$(xcrun simctl list devices available | grep iPhone | head -1 | grep -o '([^)]*)')
    if [ -n "$FIRST_IPHONE" ]; then
        DEVICE_ID=$(echo $FIRST_IPHONE | tr -d '()')
        xcrun simctl boot $DEVICE_ID
        open -a Simulator
        echo "✅ Started iOS Simulator with device ID: $DEVICE_ID"
    fi
fi

# Start the Expo development server
echo "🌟 Starting Expo development server..."
echo "📝 Note: First launch may take 5-10 minutes as it installs iOS dependencies"
echo "💡 Tip: Keep this terminal open. Press 'i' to open in iOS simulator once Metro bundler starts"

# Option 1: Direct iOS launch (builds the app and opens in simulator)
echo "🔨 Building and launching in iOS simulator..."
npx expo run:ios

# If the above fails, you can try the alternative approach:
# npx expo start
# Then press 'i' in the terminal when prompted