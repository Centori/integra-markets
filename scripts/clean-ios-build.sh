#!/bin/bash

echo "Cleaning iOS build environment..."

# Remove iOS directory
rm -rf ios/

# Clear all caches
rm -rf ~/Library/Developer/Xcode/DerivedData
rm -rf node_modules/.cache
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*

# Reinstall dependencies
npm install

# Prebuild with clean flag
npx expo prebuild --clean --platform ios

# Navigate to iOS directory
cd ios

# Clean CocoaPods
pod deintegrate
pod cache clean --all
rm -rf Pods/
rm Podfile.lock

# Reinstall pods
pod install --repo-update

cd ..

echo "iOS build environment cleaned successfully!"