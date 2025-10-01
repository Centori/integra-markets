#!/bin/bash

# Test notification script for iOS Simulator
# Usage: ./scripts/test-notifications.sh

echo "🧪 Integra Markets - Notification Testing Suite"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if simulator is running
check_simulator() {
    if xcrun simctl list devices | grep -q "Booted"; then
        echo -e "${GREEN}✅ iOS Simulator is running${NC}"
        return 0
    else
        echo -e "${RED}❌ No iOS Simulator is running${NC}"
        echo "Please start the iOS Simulator first with: npm run ios"
        exit 1
    fi
}

# Send notification to simulator
send_notification() {
    local file=$1
    local description=$2
    
    echo -e "${BLUE}📤 Sending: ${description}${NC}"
    
    if xcrun simctl push booted com.centori.integramarkets "test-notifications/${file}" 2>/dev/null; then
        echo -e "${GREEN}   ✓ Sent successfully${NC}"
    else
        echo -e "${RED}   ✗ Failed to send${NC}"
    fi
}

# Main execution
main() {
    # Check simulator
    check_simulator
    echo ""
    
    # Get simulator info
    DEVICE_ID=$(xcrun simctl list devices | grep "Booted" | head -1 | grep -oE '[A-F0-9-]{36}')
    DEVICE_NAME=$(xcrun simctl list devices | grep "Booted" | head -1 | sed 's/.*(\(.*\)).*/\1/' | sed 's/ (Booted)//')
    
    echo -e "${GREEN}📱 Target Device:${NC} ${DEVICE_NAME}"
    echo -e "${GREEN}🆔 Device ID:${NC} ${DEVICE_ID}"
    echo ""
    echo "Starting notification tests..."
    echo "------------------------------"
    echo ""
    
    # Test different notification types
    if [[ "$1" == "quick" ]]; then
        # Quick test - just one notification
        send_notification "market-alert.apns" "Market Alert"
    else
        # Full test suite
        send_notification "market-alert.apns" "Market Alert (Gold +3.2%)"
        sleep 2
        
        send_notification "breaking-news.apns" "Breaking News (OPEC)"
        sleep 2
        
        send_notification "price-alert.apns" "Price Alert (BTC < $40k)"
        sleep 1
    fi
    
    echo ""
    echo -e "${GREEN}✅ All test notifications sent!${NC}"
    echo ""
    echo "📋 Check the simulator for:"
    echo "   • Notification appearance"
    echo "   • Badge count updates"
    echo "   • Icon display"
    echo "   • Sound playback"
    echo ""
    echo "💡 Tips:"
    echo "   • Pull down from top to see Notification Center"
    echo "   • Click notifications to test interaction"
    echo "   • Check app icon for badge count"
}

# Handle arguments
case "$1" in
    help|--help|-h)
        echo "Usage: $0 [quick|full]"
        echo ""
        echo "Options:"
        echo "  quick  - Send only one test notification"
        echo "  full   - Send all test notifications (default)"
        echo "  help   - Show this help message"
        exit 0
        ;;
    quick)
        main "quick"
        ;;
    *)
        main "full"
        ;;
esac
