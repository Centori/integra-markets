from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
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
    notification_type: Optional[str] = Field("default", description="Type of notification (market_alert, breaking_news, etc)")
    sound: Optional[bool] = True
    badge: Optional[int] = None

class NotificationResponse(BaseModel):
    status: str
    message: str
    notification_id: Optional[UUID] = None

class NotificationPreferenceUpdate(BaseModel):
    market_alerts: Optional[bool] = None
    breaking_news: Optional[bool] = None
    price_alerts: Optional[bool] = None
    weekend_updates: Optional[bool] = None
    sound_enabled: Optional[bool] = None
    vibration_enabled: Optional[bool] = None
    quiet_hours_start: Optional[int] = None
    quiet_hours_end: Optional[int] = None

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
    updated_at: datetime
