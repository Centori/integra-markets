from tortoise import fields, models
from datetime import datetime
from typing import Optional, List

class AlertPreference(models.Model):
    """User alert preferences for market monitoring"""
    id = fields.UUIDField(pk=True)
    user_id = fields.CharField(max_length=255)
    enabled = fields.BooleanField(default=True)
    price_movements = fields.BooleanField(default=True)
    breaking_news = fields.BooleanField(default=True)
    volume_alerts = fields.BooleanField(default=False)
    price_threshold = fields.FloatField(default=2.0)  # Percentage change
    volume_threshold = fields.IntField(default=1000000)  # Volume threshold
    check_interval = fields.IntField(default=30000)  # Milliseconds
    keywords = fields.JSONField(default=list)  # List of keywords to monitor
    website_urls = fields.JSONField(default=list)  # List of news sources
    alert_frequency = fields.CharField(max_length=50, default='medium')  # low, medium, high
    alert_threshold = fields.CharField(max_length=50, default='medium')  # low, medium, high
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "alert_preferences"
        unique_together = ("user_id",)

    def __str__(self):
        return f"Alert preferences for {self.user_id}"