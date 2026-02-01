"""
Notification Service for Integra Markets
Handles push notifications, alerts, and real-time updates
"""
import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from uuid import UUID
import logging
from dataclasses import dataclass
from enum import Enum

# Supabase client
from supabase import create_client, Client
import httpx

# Push notification services
try:
    from exponent_server_sdk import (
        DeviceNotRegisteredError,
        PushClient,
        PushMessage,
        PushServerError,
        PushTicket,
        PushTicketError,
    )
    EXPO_PUSH_AVAILABLE = True
except ImportError:
    EXPO_PUSH_AVAILABLE = False
    logging.warning("Expo Server SDK not available. Install with: pip install exponent-server-sdk")

logger = logging.getLogger(__name__)

class NotificationType(str, Enum):
    MARKET_ALERT = "market_alert"
    BREAKING_NEWS = "breaking_news"
    PRICE_ALERT = "price_alert"
    THRESHOLD_ALERT = "threshold_alert"
    SYSTEM = "system"

class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class NotificationData:
    title: str
    body: str
    type: NotificationType
    severity: Severity = Severity.MEDIUM
    commodity: Optional[str] = None
    data: Dict[str, Any] = None
    user_ids: Optional[List[str]] = None  # None means broadcast to all

class NotificationService:
    def __init__(self):
        # Initialize Supabase
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Supabase credentials not found in environment")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        
        # Initialize Expo push client if available
        self.push_client = PushClient() if EXPO_PUSH_AVAILABLE else None
        
        logger.info(f"NotificationService initialized - Push client: {'Available' if self.push_client else 'Not Available'}")
    
    async def register_push_token(self, user_id: str, token: str, device_type: str, device_info: Dict = None) -> Optional[Dict[str, Any]]:
        """Register or update a push token for a user and return the token row"""
        try:
            # Check if token already exists
            existing = self.supabase.table('push_tokens').select('id').eq('token', token).execute()
            
            if existing.data:
                # Update existing token
                self.supabase.table('push_tokens').update({
                    'user_id': user_id,
                    'device_type': device_type,
                    'device_info': device_info or {},
                    'is_active': True,
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('token', token).execute()
            else:
                # Insert new token
                self.supabase.table('push_tokens').insert({
                    'user_id': user_id,
                    'token': token,
                    'device_type': device_type,
                    'device_info': device_info or {},
                    'is_active': True
                }).execute()
            
            # Fetch complete token row
            row = self.supabase.table('push_tokens').select('*').eq('token', token).execute()
            if row.data:
                return row.data[0]
            
            logger.info(f"Push token registered for user {user_id}")
            return None
            
        except Exception as e:
            logger.error(f"Error registering push token: {e}")
            return None
    
    async def deactivate_device_token(self, token: str) -> bool:
        """Deactivate a device token by setting is_active to False"""
        try:
            existing = self.supabase.table('push_tokens').select('id').eq('token', token).execute()
            if not existing.data:
                return False
            self.supabase.table('push_tokens').update({
                'is_active': False,
                'updated_at': datetime.utcnow().isoformat()
            }).eq('token', token).execute()
            return True
        except Exception as e:
            logger.error(f"Error deactivating device token: {e}")
            return False
    
    async def get_user_tokens(self, user_id: str) -> List[str]:
        """Get all active push tokens for a user"""
        try:
            result = self.supabase.table('push_tokens').select('token').eq('user_id', user_id).eq('is_active', True).execute()
            return [row['token'] for row in result.data]
        except Exception as e:
            logger.error(f"Error fetching user tokens: {e}")
            return []
    
    async def save_notification(self, user_id: str, notification: NotificationData) -> Optional[Dict]:
        """Save a notification to the database"""
        try:
            result = self.supabase.table('notifications').insert({
                'user_id': user_id,
                'title': notification.title,
                'body': notification.body,
                'type': notification.type,
                'severity': notification.severity,
                'commodity': notification.commodity,
                'data': notification.data or {},
                'is_read': False,
                'is_delivered': False
            }).execute()
            
            return result.data[0] if result.data else None
            
        except Exception as e:
            logger.error(f"Error saving notification: {e}")
            return None
    
    async def send_push_notification(self, tokens: List[str], notification: NotificationData) -> Dict[str, Any]:
        """Send push notification via Expo"""
        if not self.push_client or not EXPO_PUSH_AVAILABLE:
            logger.warning("Push client not available")
            return {"success": False, "message": "Push client not available", "tickets": []}
        
        messages = []
        for token in tokens:
            messages.append(PushMessage(
                to=token,
                title=notification.title,
                body=notification.body,
                data=notification.data or {}
            ))
        
        try:
            tickets = []
            for chunk in self._chunk_list(messages, 100):
                response = await asyncio.get_event_loop().run_in_executor(None, self.push_client.publish, chunk)
                tickets.extend(response)
            return {"success": True, "message": "Push notifications sent", "tickets": tickets}
        except Exception as e:
            logger.error(f"Error sending push notifications: {e}")
            return {"success": False, "message": str(e), "tickets": []}
    
    async def send_notification(self, notification: NotificationData) -> Dict[str, Any]:
        """Send notification to specific users or broadcast"""
        try:
            user_ids = notification.user_ids
            if user_ids is None:
                # Broadcast: fetch all users with push tokens
                all_tokens = self.supabase.table('push_tokens').select('user_id', 'token').eq('is_active', True).execute()
                tokens = [row['token'] for row in all_tokens.data]
                
                # Save a system notification per user if desired (optional)
                results = await self.send_push_notification(tokens, notification)
                return results
            else:
                # Send to specific users
                tokens = []
                for uid in user_ids:
                    tokens.extend(await self.get_user_tokens(uid))
                save_results = []
                for uid in user_ids:
                    saved = await self.save_notification(uid, notification)
                    if saved:
                        save_results.append(saved)
                push_results = await self.send_push_notification(tokens, notification)
                return {
                    "success": push_results.get("success", False),
                    "message": push_results.get("message", "Sent"),
                    "saved": save_results,
                }
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
            return {"success": False, "message": str(e)}
    
    async def get_user_notifications(self, user_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Get notifications for a user"""
        try:
            result = self.supabase.table('notifications')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(limit)\
                .range(offset, offset + limit - 1)\
                .execute()
            
            return result.data
            
        except Exception as e:
            logger.error(f"Error fetching notifications: {e}")
            return []
    
    async def get_unread_count(self, user_id: str) -> int:
        """Get unread notification count for a user"""
        try:
            result = self.supabase.rpc('get_unread_notification_count', {'p_user_id': user_id}).execute()
            return result.data if result.data is not None else 0
        except Exception as e:
            logger.error(f"Error getting unread count: {e}")
            return 0
    
    async def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Mark a notification as read"""
        try:
            result = self.supabase.rpc('mark_notification_read', {
                'p_notification_id': notification_id,
                'p_user_id': user_id
            }).execute()
            return result.data if result.data is not None else False
        except Exception as e:
            logger.error(f"Error marking notification as read: {e}")
            return False
    
    async def mark_all_as_read(self, user_id: str) -> bool:
        """Mark all notifications as read for a user"""
        try:
            result = self.supabase.table('notifications').update({
                'is_read': True,
                'read_at': datetime.utcnow().isoformat()
            }).eq('user_id', user_id).eq('is_read', False).execute()
            
            return True
        except Exception as e:
            logger.error(f"Error marking all as read: {e}")
            return False
    
    async def get_alert_preferences(self, user_id: str) -> Optional[Dict]:
        """Get user's alert preferences"""
        try:
            result = self.supabase.table('alert_preferences').select('*').eq('user_id', user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error fetching alert preferences: {e}")
            return None
    
    async def update_alert_preferences(self, user_id: str, preferences: Dict) -> bool:
        """Update user's alert preferences"""
        try:
            # Check if preferences exist
            existing = self.supabase.table('alert_preferences').select('id').eq('user_id', user_id).execute()
            
            if existing.data:
                # Update existing
                result = self.supabase.table('alert_preferences').update({
                    **preferences,
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('user_id', user_id).execute()
            else:
                # Insert new
                result = self.supabase.table('alert_preferences').insert({
                    'user_id': user_id,
                    **preferences
                }).execute()
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating alert preferences: {e}")
            return False
    
    async def create_market_alert(self, alert_data: Dict) -> Optional[Dict]:
        """Create a market alert and notify relevant users"""
        try:
            # Save market alert
            market_alert = self.supabase.table('market_alerts').insert(alert_data).execute()
            
            if not market_alert.data:
                return None
            
            alert = market_alert.data[0]
            
            # Find users interested in this commodity
            prefs = self.supabase.table('alert_preferences')\
                .select('user_id')\
                .contains('commodities', [alert['commodity']])\
                .eq('market_alerts', True)\
                .execute()
            
            if prefs.data:
                # Create notification
                notification = NotificationData(
                    title=f"{alert['commodity']} Alert",
                    body=alert['message'],
                    type=NotificationType.MARKET_ALERT,
                    severity=alert['severity'],
                    commodity=alert['commodity'],
                    data={
                        'alert_id': alert['id'],
                        'commodity': alert['commodity'],
                        'change_percent': alert.get('change_percent'),
                        'current_price': alert.get('current_price')
                    },
                    user_ids=[p['user_id'] for p in prefs.data]
                )
                
                await self.send_notification(notification)
            
            return alert
            
        except Exception as e:
            logger.error(f"Error creating market alert: {e}")
            return None
    
    async def get_market_alerts(self, commodity: Optional[str] = None, limit: int = 50) -> List[Dict]:
        """Get market alerts, optionally filtered by commodity"""
        try:
            query = self.supabase.table('market_alerts').select('*').order('created_at', desc=True).limit(limit)
            if commodity:
                query = query.eq('commodity', commodity)
            result = query.execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching market alerts: {e}")
            return []
    
    def _chunk_list(self, lst: List, chunk_size: int) -> List[List]:
        return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]

notification_service = NotificationService()
