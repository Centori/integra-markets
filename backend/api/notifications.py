from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import httpx
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/notifications", tags=["notifications"])

# Expo push notification service URL
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

# Request models
class PushTokenRequest(BaseModel):
    token: str
    device_type: str = "ios"  # ios, android, web

class NotificationRequest(BaseModel):
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None
    priority: str = "default"  # default, high
    channel_id: Optional[str] = None  # For Android

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
