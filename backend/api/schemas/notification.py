from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID

class DeviceTokenCreate(BaseModel):
    token: str = Field(..., description="The push notification token from the device")
    device_type: str = Field(..., description="Device type (ios/android)")
    app_version: Optional[str] = Field(None, description="App version")

class DeviceTokenResponse(BaseModel):
    id: UUID
    token: str
    device_type: str
    created_at: datetime
    is_active: bool

class NotificationRequest(BaseModel):
    title: str = Field(..., description="Notification title")
    body: str = Field(..., description="Notification message")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional data to send with notification")
    notification_type: Optional[str] = Field("system", description="Type of notification (market_alert, breaking_news, price_alert, threshold_alert, system)")
    sound: Optional[bool] = True
    badge: Optional[int] = None

class NotificationResponse(BaseModel):
    success: bool
    message: str
    notification_id: Optional[str] = None

class NotificationPreferenceUpdate(BaseModel):
    market_alerts: Optional[bool] = None
    breaking_news: Optional[bool] = None
    price_alerts: Optional[bool] = None
    weekend_updates: Optional[bool] = None
    sound_enabled: Optional[bool] = None
    vibration_enabled: Optional[bool] = None
    quiet_hours_start: Optional[int] = None
    quiet_hours_end: Optional[int] = None
    keywords: Optional[List[str]] = None
    website_urls: Optional[List[str]] = None

class NotificationPreferenceResponse(BaseModel):
    user_id: str
    market_alerts: bool
    breaking_news: bool
    price_alerts: bool
    weekend_updates: bool
    sound_enabled: bool
    vibration_enabled: bool
    quiet_hours_start: Optional[int]
    quiet_hours_end: Optional[int]
    keywords: Optional[List[str]]
    website_urls: Optional[List[str]]
    updated_at: datetime
