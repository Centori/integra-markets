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
router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.post("/register-token", response_model=DeviceTokenResponse)
async def register_push_token(
    request: DeviceTokenCreate,
    user_id: Optional[str] = None  # From your auth dependency
):
    """Register a device token for push notifications"""
    try:
        service = NotificationService()
        token = await service.register_device_token(
            user_id=user_id,
            token=request.token,
            device_type=request.device_type,
            device_info=request.device_info
        )
        return DeviceTokenResponse(
            id=token.id,
            token=token.token,
            device_type=token.device_type,
            is_active=token.is_active,
            created_at=token.created_at
        )
    except Exception as e:
        logger.error(f"Failed to register device token: {e}")
        raise HTTPException(status_code=500, detail="Failed to register device token")

@router.post("/test", response_model=NotificationResponse)
async def send_test_notification(
    request: NotificationRequest,
    background_tasks: BackgroundTasks
):
    """Send a test notification"""
    try:
        service = NotificationService()
        
        # Send notification in background
        background_tasks.add_task(
            service.send_notification,
            title=request.title,
            body=request.body,
            data=request.data or {},
            user_ids=request.user_ids
        )
        
        return NotificationResponse(
            success=True,
            message="Test notification queued successfully",
            notification_id=f"test_{datetime.now().isoformat()}"
        )
    except Exception as e:
        logger.error(f"Failed to send test notification: {e}")
        raise HTTPException(status_code=500, detail="Failed to send test notification")

@router.post("/user/{user_id}", response_model=NotificationResponse)
async def send_user_notification(
    user_id: str,
    request: NotificationRequest,
    background_tasks: BackgroundTasks
):
    """Send notification to specific user"""
    try:
        service = NotificationService()
        
        # Send notification in background
        background_tasks.add_task(
            service.send_notification,
            title=request.title,
            body=request.body,
            data=request.data or {},
            user_ids=[user_id]
        )
        
        return NotificationResponse(
            success=True,
            message=f"Notification sent to user {user_id}",
            notification_id=f"user_{user_id}_{datetime.now().isoformat()}"
        )
    except Exception as e:
        logger.error(f"Failed to send user notification: {e}")
        raise HTTPException(status_code=500, detail="Failed to send user notification")

@router.get("/preferences/{user_id}", response_model=NotificationPreferenceResponse)
async def get_user_preferences(user_id: str):
    """Get user notification preferences"""
    try:
        service = NotificationService()
        preferences = await service.get_user_preferences(user_id)
        return preferences
    except Exception as e:
        logger.error(f"Failed to get user preferences: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user preferences")

@router.put("/preferences/{user_id}", response_model=NotificationPreferenceResponse)
async def update_user_preferences(
    user_id: str,
    preferences: NotificationPreferenceUpdate
):
    """Update user notification preferences"""
    try:
        service = NotificationService()
        updated_preferences = await service.update_user_preferences(user_id, preferences)
        return updated_preferences
    except Exception as e:
        logger.error(f"Failed to update user preferences: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user preferences")

@router.delete("/token/{token}")
async def deactivate_device_token(token: str):
    """Deactivate a device token"""
    try:
        service = NotificationService()
        await service.deactivate_device_token(token)
        return {"success": True, "message": "Device token deactivated"}
    except Exception as e:
        logger.error(f"Failed to deactivate device token: {e}")
        raise HTTPException(status_code=500, detail="Failed to deactivate device token")
