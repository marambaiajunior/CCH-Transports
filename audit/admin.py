"""
Admin registrations for the audit application.

Register AuditLog with read‑only fields to prevent modification.
"""

from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "user", "content_type", "object_id", "created_at")
    readonly_fields = ("user", "action", "content_type", "object_id", "message", "created_at", "updated_at")
    list_filter = ("action", "user")
    search_fields = ("message",)
