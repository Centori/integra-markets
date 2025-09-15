from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from datetime import datetime
import httpx
import logging
from typing import List, Optional
from uuid import UUID

from .schemas.notification import (
    DeviceTokenCreate,
    DeviceTokenResponse,
    NotificationRequest,
    NotificationResponse,
    NotificationPreferenceUpdate,
    NotificationPreferenceResponse
)
from .services.notification_service import NotificationService
from .models.notification import DeviceToken, NotificationPreference

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.post("/register-token", response_model=DeviceTokenResponse)
async def register_push_token(
    request: DeviceTokenCreate,
    user_id: Optional[str] = None  # From your auth dependency
):
    """Register a device push token"""
    try:
        token = await NotificationService.register_token(
            token=request.token,
            device_type=request.device_type,
            user_id=user_id,
            app_version=request.app_version
        )
        return DeviceTokenResponse.from_orm(token)
    except Exception as e:
        logger.error(f"Error registering push token: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to register push token")

@router.post("/test", response_model=NotificationResponse)
async def send_test_notification(
    request: NotificationRequest,
    background_tasks: BackgroundTasks
):
    """Send a test notification to all registered devices"""
    try:
        tokens = await DeviceToken.filter(is_active=True).values_list('token', flat=True)
        
        # Send notifications in background
        background_tasks.add_task(
            NotificationService.send_notifications,
            tokens=tokens,
            title=request.title,
            body=request.body,
            data=request.data,
            notification_type=request.notification_type
        )
        
        return NotificationResponse(
            status="success",
            message="Test notification queued for delivery"
        )
    except Exception as e:
        logger.error(f"Error sending test notification: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send test notification")

@router.post("/user/{user_id}", response_model=NotificationResponse)
async def send_user_notification(
    user_id: str,
    request: NotificationRequest,
    background_tasks: BackgroundTasks
):
    """Send notification to a specific user's devices"""
    try:
        # Send notification in background
        background_tasks.add_task(
            NotificationService.send_user_notification,
            user_id=user_id,
            title=request.title,
            body=request.body,
            data=request.data,
            notification_type=request.notification_type
        )
        
        return NotificationResponse(
            status="success",
            message=f"Notification queued for user {user_id}"
        )
    except Exception as e:
        logger.error(f"Error sending user notification: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send notification")

@router.get("/preferences/{user_id}", response_model=NotificationPreferenceResponse)
async def get_user_preferences(user_id: str):
    """Get user's notification preferences"""
    try:
        prefs = await NotificationService.get_user_preferences(user_id)
        return NotificationPreferenceResponse.from_orm(prefs)
    except Exception as e:
        logger.error(f"Error getting user preferences: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get preferences")

@router.put("/preferences/{user_id}", response_model=NotificationPreferenceResponse)
async def update_user_preferences(
    user_id: str,
    preferences: NotificationPreferenceUpdate
):
    """Update user's notification preferences"""
    try:
        prefs = await NotificationService.update_user_preferences(
            user_id=user_id,
            **preferences.dict(exclude_unset=True)
        )
        return NotificationPreferenceResponse.from_orm(prefs)
    except Exception as e:
        logger.error(f"Error updating user preferences: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update preferences")

@router.delete("/token/{token}")
async def deactivate_device_token(token: str):
    """Deactivate a device token"""
    try:
        success = await NotificationService.deactivate_token(token)
        if not success:
            raise HTTPException(status_code=404, detail="Token not found")
        return {"status": "success", "message": "Token deactivated"}
    except Exception as e:
        logger.error(f"Error deactivating token: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to deactivate token")
