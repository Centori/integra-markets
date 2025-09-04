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
    
    async def register_push_token(self, user_id: str, token: str, device_type: str, device_info: Dict = None) -> bool:
        """Register or update a push token for a user"""
        try:
            # Check if token already exists
            existing = self.supabase.table('push_tokens').select('id').eq('token', token).execute()
            
            if existing.data:
                # Update existing token
                result = self.supabase.table('push_tokens').update({
                    'user_id': user_id,
                    'device_type': device_type,
                    'device_info': device_info or {},
                    'is_active': True,
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('token', token).execute()
            else:
                # Insert new token
                result = self.supabase.table('push_tokens').insert({
                    'user_id': user_id,
                    'token': token,
                    'device_type': device_type,
                    'device_info': device_info or {},
                    'is_active': True
                }).execute()
            
            logger.info(f"Push token registered for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error registering push token: {e}")
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
            return {"success": False, "error": "Push service not available"}
        
        try:
            # Create push messages
            messages = []
            for token in tokens:
                if not PushClient.is_exponent_push_token(token):
                    logger.warning(f"Invalid Expo push token: {token}")
                    continue
                
                message = PushMessage(
                    to=token,
                    title=notification.title,
                    body=notification.body,
                    data=notification.data or {},
                    priority='high',
                    sound='default',
                    badge=1,  # This will increment the app badge
                    category_id='MARKET_ALERT' if notification.type == NotificationType.MARKET_ALERT else 'BREAKING_NEWS'
                )
                messages.append(message)
            
            if not messages:
                return {"success": False, "error": "No valid tokens"}
            
            # Send notifications in chunks
            chunks = self._chunk_list(messages, 100)
            tickets = []
            
            for chunk in chunks:
                try:
                    ticket_batch = self.push_client.publish_multiple(chunk)
                    tickets.extend(ticket_batch)
                except PushServerError as e:
                    logger.error(f"Push server error: {e}")
                except Exception as e:
                    logger.error(f"Error sending push notifications: {e}")
            
            # Process tickets to check for errors
            successful = 0
            failed = 0
            
            for ticket in tickets:
                if ticket.status == 'ok':
                    successful += 1
                else:
                    failed += 1
                    logger.error(f"Push ticket error: {ticket.message}")
            
            return {
                "success": True,
                "sent": successful,
                "failed": failed,
                "total": len(tickets)
            }
            
        except Exception as e:
            logger.error(f"Error sending push notifications: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_notification(self, notification: NotificationData) -> Dict[str, Any]:
        """Send notification to users (save to DB and send push)"""
        try:
            results = {
                "notifications_saved": 0,
                "push_sent": 0,
                "errors": []
            }
            
            # Determine target users
            if notification.user_ids:
                user_ids = notification.user_ids
            else:
                # Get all users with notifications enabled
                prefs = self.supabase.table('alert_preferences').select('user_id').eq('push_notifications', True).execute()
                user_ids = [p['user_id'] for p in prefs.data]
            
            # Save notification for each user
            for user_id in user_ids:
                saved = await self.save_notification(user_id, notification)
                if saved:
                    results["notifications_saved"] += 1
                    
                    # Get user's push tokens
                    tokens = await self.get_user_tokens(user_id)
                    if tokens:
                        push_result = await self.send_push_notification(tokens, notification)
                        if push_result.get("success"):
                            results["push_sent"] += push_result.get("sent", 0)
                            
                            # Mark notification as delivered
                            self.supabase.table('notifications').update({
                                'is_delivered': True,
                                'delivered_at': datetime.utcnow().isoformat()
                            }).eq('id', saved['id']).execute()
            
            return results
            
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
            return {"error": str(e)}
    
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
                
                # Send notifications
                await self.send_notification(notification)
            
            return alert
            
        except Exception as e:
            logger.error(f"Error creating market alert: {e}")
            return None
    
    async def get_market_alerts(self, commodity: Optional[str] = None, limit: int = 50) -> List[Dict]:
        """Get recent market alerts"""
        try:
            query = self.supabase.table('market_alerts').select('*')
            
            if commodity:
                query = query.eq('commodity', commodity)
            
            result = query.order('created_at', desc=True).limit(limit).execute()
            
            return result.data
            
        except Exception as e:
            logger.error(f"Error fetching market alerts: {e}")
            return []
    
    def _chunk_list(self, lst: List, chunk_size: int) -> List[List]:
        """Split a list into chunks"""
        return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]

# Singleton instance
notification_service = NotificationService()
