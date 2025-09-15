import httpx
import logging
import asyncio
from datetime import datetime, time
from typing import List, Dict, Any, Optional
from uuid import UUID

from ..models.notification import DeviceToken, NotificationLog, NotificationPreference

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
BATCH_SIZE = 100  # Maximum number of notifications to send in one request

class NotificationService:
    @staticmethod
    async def register_token(
        token: str,
        device_type: str,
        user_id: Optional[str] = None,
        app_version: Optional[str] = None
    ) -> DeviceToken:
        """Register or update a device token"""
        token_obj, created = await DeviceToken.get_or_create(
            token=token,
            defaults={
                "device_type": device_type,
                "user_id": user_id,
                "app_version": app_version,
                "is_active": True
            }
        )
        
        if not created:
            token_obj.device_type = device_type
            token_obj.user_id = user_id
            token_obj.app_version = app_version
            token_obj.is_active = True
            await token_obj.save()
        
        return token_obj

    @staticmethod
    async def deactivate_token(token: str) -> bool:
        """Mark a token as inactive"""
        token_obj = await DeviceToken.get_or_none(token=token)
        if token_obj:
            token_obj.is_active = False
            await token_obj.save()
            return True
        return False

    @staticmethod
    async def get_user_tokens(user_id: str) -> List[DeviceToken]:
        """Get all active tokens for a user"""
        return await DeviceToken.filter(
            user_id=user_id,
            is_active=True
        ).all()

    @staticmethod
    async def get_user_preferences(user_id: str) -> NotificationPreference:
        """Get or create notification preferences for a user"""
        pref, _ = await NotificationPreference.get_or_create(
            user_id=user_id
        )
        return pref

    @staticmethod
    async def update_user_preferences(
        user_id: str,
        **preferences
    ) -> NotificationPreference:
        """Update user notification preferences"""
        pref = await NotificationService.get_user_preferences(user_id)
        
        # Update only provided fields
        for key, value in preferences.items():
            if hasattr(pref, key) and value is not None:
                setattr(pref, key, value)
        
        await pref.save()
        return pref

    @staticmethod
    async def can_send_notification(user_id: str, notification_type: str) -> bool:
        """Check if notification can be sent based on user preferences"""
        pref = await NotificationService.get_user_preferences(user_id)
        
        # Check quiet hours
        if pref.quiet_hours_start is not None and pref.quiet_hours_end is not None:
            current_hour = datetime.now().hour
            quiet_start = pref.quiet_hours_start
            quiet_end = pref.quiet_hours_end
            
            # Handle overnight quiet hours
            if quiet_start > quiet_end:
                if current_hour >= quiet_start or current_hour < quiet_end:
                    return False
            else:
                if quiet_start <= current_hour < quiet_end:
                    return False
        
        # Check notification type preferences
        if notification_type == "market_alert" and not pref.market_alerts:
            return False
        elif notification_type == "breaking_news" and not pref.breaking_news:
            return False
        elif notification_type == "price_alert" and not pref.price_alerts:
            return False
        
        # Check weekend updates
        if not pref.weekend_updates and datetime.now().weekday() >= 5:
            return False
        
        return True

    @staticmethod
    async def send_notifications(
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        notification_type: str = "default"
    ) -> List[UUID]:
        """Send notifications to multiple tokens in batches"""
        if not tokens:
            return []
        
        notification_ids = []
        
        # Process in batches
        for i in range(0, len(tokens), BATCH_SIZE):
            batch_tokens = tokens[i:i + BATCH_SIZE]
            
            # Prepare messages
            messages = []
            for token in batch_tokens:
                device_token = await DeviceToken.get_or_none(token=token)
                if not device_token or not device_token.is_active:
                    continue
                
                if device_token.user_id:
                    can_send = await NotificationService.can_send_notification(
                        device_token.user_id,
                        notification_type
                    )
                    if not can_send:
                        continue
                
                messages.append({
                    "to": token,
                    "title": title,
                    "body": body,
                    "data": data or {},
                    "sound": "default",
                })
            
            if not messages:
                continue
            
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        EXPO_PUSH_URL,
                        json=messages,
                        headers={"Accept": "application/json", "Content-Type": "application/json"}
                    )
                    
                    if response.status_code == 200:
                        response_data = response.json()
                        
                        # Process results
                        for idx, result in enumerate(response_data.get("data", [])):
                            device_token = await DeviceToken.get(token=messages[idx]["to"])
                            
                            # Create notification log
                            log = await NotificationLog.create(
                                device_token=device_token,
                                title=title,
                                body=body,
                                data=data,
                                notification_type=notification_type,
                                delivered="error" not in result,
                                error=result.get("error")
                            )
                            
                            if "error" in result:
                                if result["error"] == "DeviceNotRegistered":
                                    await NotificationService.deactivate_token(messages[idx]["to"])
                            else:
                                notification_ids.append(log.id)
                                await device_token.mark_used()
                    else:
                        logger.error(f"Failed to send notifications: {response.text}")
                
            except Exception as e:
                logger.error(f"Error sending notifications: {str(e)}")
        
        return notification_ids

    @staticmethod
    async def send_user_notification(
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        notification_type: str = "default"
    ) -> List[UUID]:
        """Send notification to all devices of a user"""
        tokens = await NotificationService.get_user_tokens(user_id)
        token_strings = [t.token for t in tokens]
        
        return await NotificationService.send_notifications(
            token_strings,
            title,
            body,
            data,
            notification_type
        )
