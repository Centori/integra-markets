from pydantic import BaseModel
from typing import Dict, Any, Optional

class PushTokenRequest(BaseModel):
    token: str
    device_type: str = "ios"  # ios, android, web

class NotificationRequest(BaseModel):
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None
    priority: str = "default"  # default, high
    channel_id: Optional[str] = None  # For Android
