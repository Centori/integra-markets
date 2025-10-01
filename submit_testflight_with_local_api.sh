#!/bin/bash

# Script to build and submit a new TestFlight version with updated API URL

echo "========================================"
echo "TestFlight Build with Updated API URL"
echo "========================================"

# Check current API URL in app.json
CURRENT_API=$(grep -o '"apiUrl": "[^"]*"' app.json | cut -d'"' -f4)
echo "Current API URL: $CURRENT_API"

# Increment build number
CURRENT_BUILD=$(grep -o '"buildNumber": "[^"]*"' app.json | cut -d'"' -f4)
NEW_BUILD=$((CURRENT_BUILD + 1))
echo "Incrementing build number from $CURRENT_BUILD to $NEW_BUILD"

# Update build number in app.json
sed -i '' "s/\"buildNumber\": \"$CURRENT_BUILD\"/\"buildNumber\": \"$NEW_BUILD\"/" app.json

echo ""
echo "Build $NEW_BUILD will use API URL: $CURRENT_API"
echo ""
echo "⚠️  WARNING: TestFlight builds should use a production API URL!"
echo "   Current URL ($CURRENT_API) is a local IP"
echo ""
read -p "Continue with build? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Building for TestFlight..."
    eas build --platform ios --profile production --auto-submit
else
    echo "Build cancelled. Reverting build number..."
    sed -i '' "s/\"buildNumber\": \"$NEW_BUILD\"/\"buildNumber\": \"$CURRENT_BUILD\"/" app.json
fi
