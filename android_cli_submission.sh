#!/bin/bash

echo "=========================================="
echo "Android CLI Build & Submission Guide"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Build the Android App${NC}"
echo "----------------------------------------"
echo "Choose your build type:"
echo ""
echo -e "${GREEN}Option A: Production Build (for Play Store)${NC}"
echo "eas build --platform android --profile production"
echo ""
echo -e "${GREEN}Option B: Preview Build (for testing)${NC}"
echo "eas build --platform android --profile preview"
echo ""
echo -e "${GREEN}Option C: Development Build${NC}"
echo "eas build --platform android --profile development"
echo ""

echo -e "${BLUE}Step 2: Monitor Build Progress${NC}"
echo "----------------------------------------"
echo "# Check build status"
echo "eas build:list --platform android --limit 5"
echo ""
echo "# View specific build"
echo "eas build:view [BUILD_ID]"
echo ""

echo -e "${BLUE}Step 3: Submit to Google Play Store${NC}"
echo "----------------------------------------"
echo ""
echo -e "${GREEN}Option 1: Submit Latest Build${NC}"
echo "eas submit --platform android --latest"
echo ""
echo -e "${GREEN}Option 2: Submit Specific Build${NC}"
echo "eas submit --platform android --id [BUILD_ID]"
echo ""
echo -e "${GREEN}Option 3: Submit with Path to AAB${NC}"
echo "eas submit --platform android --path ./path/to/app.aab"
echo ""

echo -e "${BLUE}Step 4: Configure Submission (if needed)${NC}"
echo "----------------------------------------"
echo "# Interactive submission with options"
echo "eas submit --platform android --latest \\"
echo "  --track internal \\"
echo "  --release-status draft"
echo ""
echo "Available tracks:"
echo "  - internal (recommended for first submission)"
echo "  - alpha"
echo "  - beta"
echo "  - production"
echo ""

echo -e "${YELLOW}Prerequisites Check:${NC}"
echo "----------------------------------------"

# Check if EAS CLI is installed
if command -v eas &> /dev/null; then
    echo -e "✅ EAS CLI installed: $(eas --version)"
else
    echo -e "❌ EAS CLI not installed"
    echo "   Install with: npm install -g eas-cli"
fi

# Check if logged in
if eas whoami &> /dev/null; then
    echo -e "✅ Logged in as: $(eas whoami 2>/dev/null)"
else
    echo -e "❌ Not logged in to EAS"
    echo "   Login with: eas login"
fi

# Check for service account
if [ -f "./google-service-account.json" ]; then
    echo -e "✅ Google service account found"
else
    echo -e "⚠️  Google service account not found"
    echo "   You'll need to upload manually or set up service account"
    echo "   See: https://docs.expo.dev/submit/android/#configure-google-project"
fi

echo ""
echo -e "${BLUE}Complete One-Line Commands:${NC}"
echo "=========================================="
echo ""
echo -e "${GREEN}1. Build and Submit in One Go:${NC}"
echo "# Build production and auto-submit when ready"
echo "eas build --platform android --profile production --auto-submit"
echo ""
echo -e "${GREEN}2. Build with Custom Version:${NC}"
echo "# Increment version code automatically"
echo "eas build --platform android --profile production --clear-cache"
echo ""
echo -e "${GREEN}3. Build and Download:${NC}"
echo "# Build and download AAB when ready"
echo "eas build --platform android --profile production --wait"
echo ""

echo -e "${BLUE}Checking Current Status:${NC}"
echo "=========================================="

# Show current version from app.json
if [ -f "app.json" ]; then
    VERSION_CODE=$(grep -A5 '"android"' app.json | grep '"versionCode"' | sed 's/[^0-9]//g')
    echo "Current Version Code: $VERSION_CODE"
    echo ""
    echo -e "${YELLOW}Remember to increment versionCode in app.json for each Play Store upload!${NC}"
fi

echo ""
echo -e "${BLUE}Quick Submit Script:${NC}"
echo "=========================================="
echo '#!/bin/bash'
echo '# Save this as submit_android.sh'
echo ''
echo '# Build and auto-submit'
echo 'echo "Building Android production release..."'
echo 'BUILD_ID=$(eas build --platform android --profile production --non-interactive --json | jq -r ".id")'
echo ''
echo 'echo "Build started with ID: $BUILD_ID"'
echo 'echo "Waiting for build to complete..."'
echo ''
echo '# Wait for build'
echo 'eas build:wait --build-id $BUILD_ID'
echo ''
echo '# Submit to Play Store'
echo 'echo "Submitting to Google Play Store..."'
echo 'eas submit --platform android --id $BUILD_ID --track internal'
echo ''
echo 'echo "✅ Build and submission complete!"'
