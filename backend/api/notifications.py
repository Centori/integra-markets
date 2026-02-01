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
from ..services.notification_service import NotificationService, NotificationData, NotificationType, Severity

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
        token_row = await service.register_push_token(
            user_id=user_id,
            token=request.token,
            device_type=request.device_type,
            device_info={"app_version": request.app_version} if request.app_version else {}
        )
        if not token_row:
            raise HTTPException(status_code=500, detail="Failed to register device token")
        return DeviceTokenResponse(
            id=UUID(token_row.get('id')),
            token=token_row.get('token'),
            device_type=token_row.get('device_type'),
            is_active=token_row.get('is_active', True),
            created_at=datetime.fromisoformat(token_row.get('created_at')) if token_row.get('created_at') else datetime.utcnow()
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
        type_map = {
            "market_alert": NotificationType.MARKET_ALERT,
            "breaking_news": NotificationType.BREAKING_NEWS,
            "price_alert": NotificationType.PRICE_ALERT,
            "threshold_alert": NotificationType.THRESHOLD_ALERT,
            "system": NotificationType.SYSTEM
        }
        notif_type = type_map.get((request.notification_type or "system").lower(), NotificationType.SYSTEM)
        notification = NotificationData(
            title=request.title,
            body=request.body,
            type=notif_type,
            severity=Severity.MEDIUM,
            data=request.data or {},
            user_ids=None
        )
        background_tasks.add_task(service.send_notification, notification)
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
        type_map = {
            "market_alert": NotificationType.MARKET_ALERT,
            "breaking_news": NotificationType.BREAKING_NEWS,
            "price_alert": NotificationType.PRICE_ALERT,
            "threshold_alert": NotificationType.THRESHOLD_ALERT,
            "system": NotificationType.SYSTEM
        }
        notif_type = type_map.get((request.notification_type or "system").lower(), NotificationType.SYSTEM)
        notification = NotificationData(
            title=request.title,
            body=request.body,
            type=notif_type,
            severity=Severity.MEDIUM,
            data=request.data or {},
            user_ids=[user_id]
        )
        background_tasks.add_task(service.send_notification, notification)
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
        preferences = await service.get_alert_preferences(user_id)
        if not preferences:
            raise HTTPException(status_code=404, detail="Preferences not found")
        return NotificationPreferenceResponse(**preferences)
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
        success = await service.update_alert_preferences(user_id, preferences.dict(exclude_none=True))
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update user preferences")
        updated = await service.get_alert_preferences(user_id)
        return NotificationPreferenceResponse(**updated)
    except Exception as e:
        logger.error(f"Failed to update user preferences: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user preferences")

@router.delete("/token/{token}")
async def deactivate_device_token(token: str):
    """Deactivate a device token"""
    try:
        service = NotificationService()
        success = await service.deactivate_device_token(token)
        if not success:
            raise HTTPException(status_code=404, detail="Device token not found")
        return {"success": True, "message": "Device token deactivated"}
    except Exception as e:
        logger.error(f"Failed to deactivate device token: {e}")
        raise HTTPException(status_code=500, detail="Failed to deactivate device token")
