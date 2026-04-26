"""
Configuration for the core application.

The core app contains base models and shared functionality used across
other apps in the project, such as timestamped mixins and company
profile settings.
"""

from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"
