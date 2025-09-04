"""
Notification API endpoints for Integra Markets
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from fastapi.responses import JSONResponse
from typing import List, Dict, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field
import logging

# Import notification service
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.notification_service import notification_service, NotificationData, NotificationType, Severity

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/notifications", tags=["notifications"])

# Pydantic models
class RegisterTokenRequest(BaseModel):
    token: str
    device_type: str = Field(..., regex="^(ios|android|web)$")
    device_info: Optional[Dict[str, Any]] = None

class NotificationRequest(BaseModel):
    title: str
    body: str
    type: str = "system"
    severity: str = "medium"
    commodity: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    user_ids: Optional[List[str]] = None

class AlertPreferencesRequest(BaseModel):
    commodities: Optional[List[str]] = []
    regions: Optional[List[str]] = []
    currencies: Optional[List[str]] = []
    keywords: Optional[List[str]] = []
    website_urls: Optional[List[str]] = []
    alert_frequency: Optional[str] = "real-time"
    alert_threshold: Optional[str] = "medium"
    push_notifications: Optional[bool] = True
    email_alerts: Optional[bool] = False
    market_alerts: Optional[bool] = True
    breaking_news: Optional[bool] = True
    price_alerts: Optional[bool] = True
    weekend_updates: Optional[bool] = False
    sound_enabled: Optional[bool] = True
    vibration_enabled: Optional[bool] = True

class MarketAlertRequest(BaseModel):
    commodity: str
    alert_type: str = Field(..., regex="^(price_change|volume_spike|news_event|technical_indicator)$")
    current_price: Optional[float] = None
    previous_price: Optional[float] = None
    change_percent: Optional[float] = None
    volume: Optional[int] = None
    trigger_value: Optional[str] = None
    message: str
    severity: str = "medium"
    data: Optional[Dict[str, Any]] = {}

# Mock user authentication (replace with real auth)
async def get_current_user():
    # In production, this would validate JWT token and return user
    return {"id": "test-user-123", "email": "test@integramarkets.com"}

@router.post("/register-token")
async def register_push_token(
    request: RegisterTokenRequest,
    current_user: dict = Depends(get_current_user)
):
    """Register or update a push notification token"""
    try:
        success = await notification_service.register_push_token(
            user_id=current_user["id"],
            token=request.token,
            device_type=request.device_type,
            device_info=request.device_info
        )
        
        if success:
            return {"success": True, "message": "Push token registered successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to register push token")
            
    except Exception as e:
        logger.error(f"Error registering push token: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def get_notifications(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Get user's notifications"""
    try:
        notifications = await notification_service.get_user_notifications(
            user_id=current_user["id"],
            limit=limit,
            offset=offset
        )
        
        # Get unread count
        unread_count = await notification_service.get_unread_count(current_user["id"])
        
        return {
            "notifications": notifications,
            "unread_count": unread_count,
            "total": len(notifications),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Get count of unread notifications"""
    try:
        count = await notification_service.get_unread_count(current_user["id"])
        return {"unread_count": count}
    except Exception as e:
        logger.error(f"Error getting unread count: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a notification as read"""
    try:
        success = await notification_service.mark_as_read(
            notification_id=notification_id,
            user_id=current_user["id"]
        )
        
        if success:
            return {"success": True, "message": "Notification marked as read"}
        else:
            raise HTTPException(status_code=404, detail="Notification not found")
            
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mark-all-read")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    try:
        success = await notification_service.mark_all_as_read(current_user["id"])
        
        if success:
            return {"success": True, "message": "All notifications marked as read"}
        else:
            raise HTTPException(status_code=400, detail="Failed to mark notifications as read")
            
    except Exception as e:
        logger.error(f"Error marking all as read: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/preferences")
async def get_alert_preferences(current_user: dict = Depends(get_current_user)):
    """Get user's alert preferences"""
    try:
        preferences = await notification_service.get_alert_preferences(current_user["id"])
        
        if not preferences:
            # Return default preferences if none exist
            return {
                "commodities": [],
                "regions": [],
                "currencies": [],
                "keywords": [],
                "website_urls": [],
                "alert_frequency": "real-time",
                "alert_threshold": "medium",
                "push_notifications": True,
                "email_alerts": False,
                "market_alerts": True,
                "breaking_news": True,
                "price_alerts": True,
                "weekend_updates": False,
                "sound_enabled": True,
                "vibration_enabled": True
            }
        
        return preferences
        
    except Exception as e:
        logger.error(f"Error fetching alert preferences: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/preferences")
async def update_alert_preferences(
    preferences: AlertPreferencesRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update user's alert preferences"""
    try:
        success = await notification_service.update_alert_preferences(
            user_id=current_user["id"],
            preferences=preferences.dict(exclude_none=True)
        )
        
        if success:
            return {"success": True, "message": "Alert preferences updated"}
        else:
            raise HTTPException(status_code=400, detail="Failed to update preferences")
            
    except Exception as e:
        logger.error(f"Error updating alert preferences: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market-alerts")
async def get_market_alerts(
    commodity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100)
):
    """Get recent market alerts"""
    try:
        alerts = await notification_service.get_market_alerts(
            commodity=commodity,
            limit=limit
        )
        
        return {
            "alerts": alerts,
            "total": len(alerts),
            "commodity": commodity
        }
        
    except Exception as e:
        logger.error(f"Error fetching market alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/market-alerts")
async def create_market_alert(alert: MarketAlertRequest):
    """Create a new market alert (admin only)"""
    # TODO: Add admin authentication check
    try:
        created_alert = await notification_service.create_market_alert(alert.dict())
        
        if created_alert:
            return {
                "success": True,
                "alert": created_alert,
                "message": "Market alert created and notifications sent"
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to create market alert")
            
    except Exception as e:
        logger.error(f"Error creating market alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send")
async def send_notification(notification: NotificationRequest):
    """Send a notification (admin only)"""
    # TODO: Add admin authentication check
    try:
        notif_data = NotificationData(
            title=notification.title,
            body=notification.body,
            type=NotificationType(notification.type),
            severity=Severity(notification.severity),
            commodity=notification.commodity,
            data=notification.data,
            user_ids=notification.user_ids
        )
        
        result = await notification_service.send_notification(notif_data)
        
        return {
            "success": True,
            "result": result,
            "message": "Notification sent successfully"
        }
        
    except Exception as e:
        logger.error(f"Error sending notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Test endpoint
@router.post("/test")
async def test_notification(current_user: dict = Depends(get_current_user)):
    """Send a test notification to the current user"""
    try:
        notif_data = NotificationData(
            title="Test Notification",
            body="This is a test notification from Integra Markets",
            type=NotificationType.SYSTEM,
            severity=Severity.LOW,
            data={"test": True, "timestamp": datetime.utcnow().isoformat()},
            user_ids=[current_user["id"]]
        )
        
        result = await notification_service.send_notification(notif_data)
        
        return {
            "success": True,
            "result": result,
            "message": "Test notification sent"
        }
        
    except Exception as e:
        logger.error(f"Error sending test notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-unread")
async def create_test_unread_notifications(
    count: int = Query(3, ge=1, le=10),
    current_user: dict = Depends(get_current_user)
):
    """Create test unread notifications for badge testing"""
    try:
        notifications_created = []
        
        test_notifications = [
            {
                "title": "Natural Gas Price Alert",
                "body": "Natural gas futures up 5.2% following storage report",
                "type": "price",
                "severity": "high",
                "commodity": "Natural Gas"
            },
            {
                "title": "Gold Market Update",
                "body": "Gold prices reach 6-month high amid Fed uncertainty",
                "type": "news",
                "severity": "medium",
                "commodity": "Gold"
            },
            {
                "title": "Crude Oil Alert",
                "body": "WTI crude drops below $75 support level",
                "type": "threshold",
                "severity": "high",
                "commodity": "Crude Oil"
            },
            {
                "title": "Market Report Available",
                "body": "Your weekly commodity market report is ready",
                "type": "system",
                "severity": "low"
            },
            {
                "title": "Silver Price Movement",
                "body": "Silver showing unusual volume spike",
                "type": "price",
                "severity": "medium",
                "commodity": "Silver"
            }
        ]
        
        for i in range(min(count, len(test_notifications))):
            notif = test_notifications[i]
            notification_id = await notification_service.create_notification(
                user_id=current_user["id"],
                title=notif["title"],
                body=notif["body"],
                type=notif["type"],
                severity=notif["severity"],
                commodity=notif.get("commodity")
            )
            notifications_created.append(notification_id)
        
        return {
            "success": True,
            "message": f"Created {len(notifications_created)} test notifications",
            "notification_ids": notifications_created,
            "count": len(notifications_created)
        }
        
    except Exception as e:
        logger.error(f"Error creating test notifications: {e}")
        raise HTTPException(status_code=500, detail=str(e))
