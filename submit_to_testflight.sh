#!/bin/bash

echo "=========================================="
echo "📱 iOS TestFlight Submission Guide"
echo "=========================================="
echo ""

# Check current iOS build number
CURRENT_BUILD=$(grep -A5 '"ios"' app.json | grep '"buildNumber"' | sed 's/[^0-9]//g')
echo "Current iOS Build Number: $CURRENT_BUILD"
echo ""

echo "Choose your action:"
echo "1) Build new iOS app and auto-submit to TestFlight"
echo "2) Build iOS only (submit manually later)"
echo "3) Submit existing build to TestFlight"
echo "4) Check recent iOS builds"
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo ""
        echo "🚀 Building and auto-submitting to TestFlight..."
        echo ""
        
        # Increment build number
        read -p "Increment build number? (y/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            NEW_BUILD=$((CURRENT_BUILD + 1))
            echo "Updating build number to: $NEW_BUILD"
            
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/\"buildNumber\": \"$CURRENT_BUILD\"/\"buildNumber\": \"$NEW_BUILD\"/" app.json
            else
                sed -i "s/\"buildNumber\": \"$CURRENT_BUILD\"/\"buildNumber\": \"$NEW_BUILD\"/" app.json
            fi
            
            echo "✅ Build number updated to $NEW_BUILD"
        fi
        
        echo ""
        echo "Starting build with auto-submit..."
        eas build --platform ios --profile production --auto-submit
        ;;
        
    2)
        echo ""
        echo "🏗️ Building iOS app (no auto-submit)..."
        eas build --platform ios --profile production
        echo ""
        echo "✅ Build started! To submit later:"
        echo "   eas submit --platform ios --latest"
        ;;
        
    3)
        echo ""
        echo "📦 Submitting existing build to TestFlight..."
        echo ""
        echo "Recent iOS builds:"
        eas build:list --platform ios --limit 5
        echo ""
        read -p "Enter Build ID (or press Enter for latest): " BUILD_ID
        
        if [ -z "$BUILD_ID" ]; then
            eas submit --platform ios --latest
        else
            eas submit --platform ios --id $BUILD_ID
        fi
        ;;
        
    4)
        echo ""
        echo "📋 Recent iOS builds:"
        eas build:list --platform ios --limit 10
        ;;
        
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "📱 TestFlight Notes:"
echo "=========================================="
echo "• Build time: 15-30 minutes"
echo "• Processing: 10-30 minutes after upload"
echo "• Review time: 24-48 hours (usually faster)"
echo "• Groq AI: ✅ Working with llama-3.3-70b-versatile"
echo "• Backend: Not required for TestFlight"
echo ""
echo "Once in TestFlight:"
echo "1. Add internal testers (immediate access)"
echo "2. Add external testers (requires review)"
echo "3. Test Groq AI chat feature"
echo ""
