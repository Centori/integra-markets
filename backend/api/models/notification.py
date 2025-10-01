from tortoise import fields, models
from datetime import datetime
from typing import Optional

class DeviceToken(models.Model):
    """Store device tokens for push notifications"""
    id = fields.UUIDField(pk=True)
    token = fields.CharField(max_length=255, unique=True)
    device_type = fields.CharField(max_length=50)  # ios, android
    user_id = fields.CharField(max_length=255, null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    last_used = fields.DatetimeField(auto_now=True)
    is_active = fields.BooleanField(default=True)
    app_version = fields.CharField(max_length=50, null=True)

    class Meta:
        table = "device_tokens"

    def __str__(self):
        return f"{self.device_type}:{self.token[:16]}..."

    async def mark_used(self):
        """Update last_used timestamp"""
        self.last_used = datetime.utcnow()
        await self.save()

class NotificationLog(models.Model):
    """Log of sent notifications"""
    id = fields.UUIDField(pk=True)
    device_token = fields.ForeignKeyField('models.DeviceToken', related_name='notifications')
    title = fields.CharField(max_length=255)
    body = fields.TextField()
    data = fields.JSONField(null=True)
    sent_at = fields.DatetimeField(auto_now_add=True)
    delivered = fields.BooleanField(default=False)
    error = fields.TextField(null=True)
    notification_type = fields.CharField(max_length=50)  # market_alert, breaking_news, etc.

    class Meta:
        table = "notification_logs"

    def __str__(self):
        return f"{self.notification_type}:{self.title}"

class NotificationPreference(models.Model):
    """User notification preferences"""
    id = fields.UUIDField(pk=True)
    user_id = fields.CharField(max_length=255)
    market_alerts = fields.BooleanField(default=True)
    breaking_news = fields.BooleanField(default=True)
    price_alerts = fields.BooleanField(default=True)
    weekend_updates = fields.BooleanField(default=False)
    sound_enabled = fields.BooleanField(default=True)
    vibration_enabled = fields.BooleanField(default=True)
    quiet_hours_start = fields.IntField(null=True)  # Hour in 24h format
    quiet_hours_end = fields.IntField(null=True)  # Hour in 24h format
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "notification_preferences"
        unique_together = ("user_id",)

    def __str__(self):
        return f"Preferences for {self.user_id}"
