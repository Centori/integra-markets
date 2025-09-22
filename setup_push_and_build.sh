#!/bin/bash

echo "📱 Integra Markets - Push Notification Setup & Build 31"
echo "======================================================="
echo ""
echo "This script will:"
echo "1. Guide you through setting up Push Notifications"
echo "2. Create Build 31 with push notifications enabled"
echo ""

# Step 1: Set up Push Notifications
echo "Step 1: Setting up Push Notifications"
echo "--------------------------------------"
echo "When prompted:"
echo "  1. Choose: 'Push Notifications: Manage your Apple Push Notifications Key'"
echo "  2. Choose: 'Set up a Push Notifications Key for @ak88/integra'"
echo "  3. Choose: 'Automatic: Create a Push Key on Apple Developer Portal'"
echo ""
echo "Press Enter to start credential setup..."
read

eas credentials --platform ios

echo ""
echo "✅ Push notification credentials configured!"
echo ""

# Step 2: Update build number in app.json
echo "Step 2: Updating build number to 31..."
echo "---------------------------------------"

# Update iOS build number
sed -i '' 's/"buildNumber": "30"/"buildNumber": "31"/' app.json

echo "✅ Build number updated to 31"
echo ""

# Step 3: Build for iOS
echo "Step 3: Building iOS app with push notifications..."
echo "---------------------------------------------------"
echo "This will create a new build with working push notifications."
echo ""
echo "Press Enter to start the build..."
read

eas build --platform ios --profile production --auto-submit

echo ""
echo "🎉 Build 31 initiated!"
echo ""
echo "Once the build is complete and processed by Apple:"
echo "1. You'll receive push notification permission prompts"
echo "2. News feed will show real articles"
echo "3. All notification features will work"
echo ""
echo "Check build status at: https://expo.dev/accounts/ak88/projects/integra/builds"
