#!/bin/bash

echo "Cleaning iOS build environment..."

# Clean Xcode DerivedData
echo "Cleaning Xcode DerivedData..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Clean iOS directory
echo "Removing iOS directory..."
rm -rf ios/

# Clean node_modules and install dependencies
echo "Cleaning node_modules..."
rm -rf node_modules/
rm -f package-lock.json
npm install

# Prebuild with clean flag
echo "Running expo prebuild..."
EXPO_NO_PRIVACY_MANIFEST_AGGREGATION=1 npx expo prebuild --clean --platform ios

# Verify Podfile has ENV variables
echo "Verifying Podfile configuration..."
if grep -q "PRIVACY_MANIFEST_AGGREGATION_ENABLED" ios/Podfile; then
    echo "✅ Privacy manifest configuration found in Podfile"
else
    echo "⚠️ Privacy manifest configuration not found in Podfile"
fi

# Install pods with verbose output
echo "Installing pods..."
cd ios
pod install --verbose | grep -i privacy
cd ..

echo "iOS build environment cleaned and rebuilt!"