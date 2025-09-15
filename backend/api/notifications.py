from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from datetime import datetime
import httpx
import logging
from .notification_models import PushTokenRequest, NotificationRequest

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/notifications", tags=["notifications"])

# In-memory token storage (replace with database in production)
device_tokens = {}

@router.post("/register-token")
async def register_push_token(request: PushTokenRequest):
        device_tokens[request.token] = {
            'type': request.device_type,
            'registered_at': datetime.now().isoformat()
        }
        
        return {
            "status": "success",
            "message": "Push token registered successfully",
            "token": request.token
        }
    except Exception as e:
        logger.error(f"Error registering push token: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to register push token")

# Expo push notification service URL
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

@router.post("/test")
async def send_test_notification(
    request: NotificationRequest
):
    """Send a test notification"""
    try:
        # Send test notification immediately
        result = await send_single_expo_notification(
            request.title,
            request.body,
            request.data
        )
        
        return {
            "status": "success",
            "message": "Test notification sent",
            "result": result
        }
    except Exception as e:
        logger.error(f"Error sending test notification: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send test notification")

# --- Helper Functions ---

async def send_single_expo_notification(
    title: str,
    body: str,
    data: Optional[Dict] = None
) -> Dict:
    """Send a single push notification and return the result"""
    message = {
        "title": title,
        "body": body,
        "sound": "default",
        "data": data or {}
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            EXPO_PUSH_URL,
            json=[message],
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json"
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"Expo push error: {response.text}")
        
        return response.json()
