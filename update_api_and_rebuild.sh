#!/bin/bash

echo "================================================"
echo "  Update API URL and Rebuild for TestFlight"
echo "================================================"

# Get current values
CURRENT_API=$(grep -o '"apiUrl": "[^"]*"' app.json | cut -d'"' -f4)
CURRENT_BUILD=$(grep -o '"buildNumber": "[^"]*"' app.json | cut -d'"' -f4)

echo ""
echo "Current API URL: $CURRENT_API"
echo "Current Build: $CURRENT_BUILD"
echo ""
echo "Enter your ngrok URL (e.g., https://abc123.ngrok-free.app):"
read -p "URL: " NGROK_URL

if [ -z "$NGROK_URL" ]; then
    echo "❌ No URL provided. Exiting."
    exit 1
fi

# Update API URL
echo ""
echo "Updating API URL to: $NGROK_URL"
sed -i '' "s|\"apiUrl\": \".*\"|\"apiUrl\": \"$NGROK_URL\"|" app.json

# Increment build number
NEW_BUILD=$((CURRENT_BUILD + 1))
echo "Incrementing build number to: $NEW_BUILD"
sed -i '' "s/\"buildNumber\": \"$CURRENT_BUILD\"/\"buildNumber\": \"$NEW_BUILD\"/" app.json

# Verify changes
echo ""
echo "✅ Updated app.json:"
grep -E "apiUrl|buildNumber" app.json

echo ""
echo "Ready to build and submit to TestFlight?"
echo "This will create Build $NEW_BUILD with API URL: $NGROK_URL"
read -p "Continue? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting build for TestFlight..."
    eas build --platform ios --profile production --auto-submit
    echo ""
    echo "✅ Build submitted! Once it's processed, you can test from TestFlight."
    echo "📱 The app will now connect to your local backend via ngrok!"
else
    echo "Build cancelled. Reverting changes..."
    sed -i '' "s|\"apiUrl\": \".*\"|\"apiUrl\": \"$CURRENT_API\"|" app.json
    sed -i '' "s/\"buildNumber\": \"$NEW_BUILD\"/\"buildNumber\": \"$CURRENT_BUILD\"/" app.json
    echo "Changes reverted."
fi
