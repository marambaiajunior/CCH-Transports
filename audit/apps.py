"""
Configuration for the audit application.

This app implements audit logging for financial changes such as
invoice creation, updates and payments.  Use GenericForeignKey to
associate logs with different models.
"""

from django.apps import AppConfig


class AuditConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "audit"
