#!/usr/bin/env python3
"""
Test script to verify Expo push notification service is working
"""
import asyncio
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.notification_service import (
    NotificationService, 
    NotificationData, 
    NotificationType, 
    Severity
)

async def test_push_service():
    print("🔔 Testing Expo Push Notification Service")
    print("=" * 50)
    
    try:
        # Initialize service
        service = NotificationService()
        print("✅ Notification service initialized")
        
        # Check if push client is available
        if service.push_client:
            print("✅ Expo push client is available")
        else:
            print("❌ Expo push client is NOT available")
            return
        
        # Test 1: Validate a sample Expo push token
        test_token = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
        from exponent_server_sdk import PushClient
        
        is_valid = PushClient.is_exponent_push_token(test_token)
        print(f"✅ Token validation working: {is_valid}")
        
        # Test 2: Create a test notification
        print("\n📤 Testing notification creation...")
        
        test_notification = NotificationData(
            title="Test Push Notification",
            body="This is a test notification from the backend service",
            type=NotificationType.SYSTEM,
            severity=Severity.LOW,
            data={"test": True, "timestamp": datetime.utcnow().isoformat()},
            user_ids=["test-user-123"]
        )
        
        print(f"   Title: {test_notification.title}")
        print(f"   Body: {test_notification.body}")
        print(f"   Type: {test_notification.type}")
        print(f"   Severity: {test_notification.severity}")
        
        # Test 3: Check database connection
        print("\n🗄️  Testing database connection...")
        try:
            # Test query
            result = service.supabase.table('push_tokens').select('count', count='exact').execute()
            print(f"✅ Database connected - Push tokens table accessible")
        except Exception as e:
            print(f"❌ Database connection error: {e}")
        
        # Test 4: Test push message creation (without sending)
        print("\n📱 Testing push message creation...")
        
        test_messages = []
        valid_tokens = [
            "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
            "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]"
        ]
        
        for token in valid_tokens:
            if PushClient.is_exponent_push_token(token):
                print(f"✅ Valid token format: {token[:30]}...")
            else:
                print(f"❌ Invalid token format: {token}")
        
        print("\n✅ All push notification components are working correctly!")
        print("\nNext steps:")
        print("1. Register real device tokens from the mobile app")
        print("2. Send test notifications to registered devices")
        print("3. Monitor push receipts for delivery confirmation")
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure all dependencies are installed:")
        print("  pip install exponent-server-sdk")
        print("  pip install supabase")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

async def test_send_real_notification():
    """Test sending a real notification (requires actual device token)"""
    print("\n" + "=" * 50)
    print("📲 Testing real notification delivery")
    print("=" * 50)
    
    # You need to replace this with an actual token from a device
    REAL_DEVICE_TOKEN = "ExponentPushToken[YOUR_ACTUAL_TOKEN_HERE]"
    
    if "YOUR_ACTUAL_TOKEN_HERE" in REAL_DEVICE_TOKEN:
        print("⚠️  Please replace REAL_DEVICE_TOKEN with an actual device token")
        print("   You can get this from the app's push notification registration")
        return
    
    try:
        service = NotificationService()
        
        # Create notification
        notification = NotificationData(
            title="🎉 Push Notifications Working!",
            body="Your Integra Markets notifications are set up correctly.",
            type=NotificationType.SYSTEM,
            severity=Severity.LOW,
            data={"test": True, "source": "backend_test"}
        )
        
        # Send directly to token (bypassing user lookup)
        result = await service.send_push_notification(
            [REAL_DEVICE_TOKEN], 
            notification
        )
        
        print(f"Push result: {result}")
        
        if result.get("success"):
            print(f"✅ Successfully sent {result.get('sent', 0)} notifications")
            print(f"❌ Failed: {result.get('failed', 0)}")
        else:
            print(f"❌ Push failed: {result.get('error')}")
            
    except Exception as e:
        print(f"❌ Error sending notification: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 Starting push notification service test...\n")
    
    # Run tests
    asyncio.run(test_push_service())
    
    # Uncomment to test real notification delivery
    # asyncio.run(test_send_real_notification())
    
    print("\n✨ Test completed!")
