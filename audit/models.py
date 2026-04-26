"""
Models for the audit application.

Defines the AuditLog model used to record financial changes and
important actions in the system.  It uses Django's contenttypes
framework to generically reference any target model.
"""

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from core.models import TimeStampedModel


class AuditAction(models.TextChoices):
    INVOICE_CREATED = "invoice_created", "Invoice Created"
    INVOICE_UPDATED = "invoice_updated", "Invoice Updated"
    PAYMENT_CREATED = "payment_created", "Payment Created"
    PAYMENT_REVERSED = "payment_reversed", "Payment Reversed"


class AuditLog(TimeStampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="audit_logs")
    action = models.CharField(max_length=50, choices=AuditAction.choices)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    message = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.get_action_display()} by {self.user} on {self.created_at}" 
