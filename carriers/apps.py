"""
Configuration for the carriers application.

This app manages carriers (motor carriers) that haul freight for the
brokerage.  It stores compliance documents, contact information and
payment terms.
"""

from django.apps import AppConfig


class CarriersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "carriers"
