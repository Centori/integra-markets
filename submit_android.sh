#!/bin/bash

# Android Build & Auto-Submit Script
# This script builds and submits your Android app to Google Play Store

set -e  # Exit on error

echo "================================================"
echo "🤖 Integra Markets - Android Build & Submit"
echo "================================================"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not installed. Installing..."
    npm install -g eas-cli
fi

if ! command -v jq &> /dev/null; then
    echo "⚠️  jq not installed (needed for JSON parsing)"
    echo "   Install with: brew install jq"
    echo "   Continuing without automatic build ID extraction..."
fi

# Increment version code
echo ""
echo "📝 Current app.json configuration:"
CURRENT_VERSION=$(grep -A5 '"android"' app.json | grep '"versionCode"' | sed 's/[^0-9]//g')
echo "   Version Code: $CURRENT_VERSION"

read -p "Do you want to increment the version code? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    NEW_VERSION=$((CURRENT_VERSION + 1))
    echo "   Updating version code to: $NEW_VERSION"
    
    # Update app.json with new version code
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/\"versionCode\": $CURRENT_VERSION/\"versionCode\": $NEW_VERSION/" app.json
    else
        # Linux
        sed -i "s/\"versionCode\": $CURRENT_VERSION/\"versionCode\": $NEW_VERSION/" app.json
    fi
    
    echo "✅ Version code updated to $NEW_VERSION"
fi

# Choose submission track
echo ""
echo "🎯 Select Google Play submission track:"
echo "1) internal (recommended for testing)"
echo "2) alpha"
echo "3) beta"
echo "4) production"
read -p "Enter choice [1-4]: " track_choice

case $track_choice in
    1) TRACK="internal";;
    2) TRACK="alpha";;
    3) TRACK="beta";;
    4) TRACK="production";;
    *) TRACK="internal"; echo "Defaulting to internal track";;
esac

echo "   Selected track: $TRACK"

# Build options
echo ""
echo "🔨 Build options:"
echo "1) Build and auto-submit"
echo "2) Build only (submit manually later)"
echo "3) Submit existing build"
read -p "Enter choice [1-3]: " build_choice

case $build_choice in
    1)
        echo ""
        echo "🚀 Starting build with auto-submit..."
        echo "   This will:"
        echo "   - Build the Android app bundle"
        echo "   - Automatically submit to Google Play ($TRACK track)"
        echo ""
        
        # Build with auto-submit
        eas build --platform android --profile production --auto-submit --submit-profile production
        
        echo "✅ Build and submission complete!"
        ;;
        
    2)
        echo ""
        echo "🏗️ Starting build (no auto-submit)..."
        
        # Build only
        if command -v jq &> /dev/null; then
            # Capture build ID if jq is available
            BUILD_OUTPUT=$(eas build --platform android --profile production --non-interactive --json)
            BUILD_ID=$(echo $BUILD_OUTPUT | jq -r '.id')
            BUILD_URL=$(echo $BUILD_OUTPUT | jq -r '.buildDetailsPageUrl')
            
            echo ""
            echo "✅ Build started!"
            echo "   Build ID: $BUILD_ID"
            echo "   Monitor at: $BUILD_URL"
            echo ""
            echo "To submit later, run:"
            echo "   eas submit --platform android --id $BUILD_ID --track $TRACK"
        else
            # Build without capturing ID
            eas build --platform android --profile production
            
            echo ""
            echo "✅ Build started!"
            echo "To submit later, run:"
            echo "   eas submit --platform android --latest --track $TRACK"
        fi
        ;;
        
    3)
        echo ""
        echo "📦 Submitting existing build..."
        
        # Show recent builds
        echo "Recent Android builds:"
        eas build:list --platform android --limit 5
        
        echo ""
        read -p "Enter Build ID (or press Enter for latest): " BUILD_ID
        
        if [ -z "$BUILD_ID" ]; then
            # Submit latest build
            eas submit --platform android --latest --track $TRACK
        else
            # Submit specific build
            eas submit --platform android --id $BUILD_ID --track $TRACK
        fi
        
        echo "✅ Submission complete!"
        ;;
        
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "================================================"
echo "📱 Next Steps:"
echo "================================================"
echo ""
echo "1. Check build status:"
echo "   eas build:list --platform android --limit 1"
echo ""
echo "2. Once submitted, check Google Play Console:"
echo "   https://play.google.com/console"
echo ""
echo "3. Testing tracks review time:"
echo "   - Internal: Immediate"
echo "   - Alpha/Beta: 2-3 hours"
echo "   - Production: 2-3 hours"
echo ""
echo "4. The app works with:"
echo "   ✅ Groq AI (llama-3.3-70b-versatile)"
echo "   ✅ Mock data when offline"
echo "   ✅ No backend required!"
echo ""
echo "Happy launching! 🚀"
