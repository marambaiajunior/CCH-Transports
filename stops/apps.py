"""
Configuration for the stops application.

This app handles multi‑stop pickup and delivery information for Trips.
Stops reference reusable Location objects and maintain ordering.
"""

from django.apps import AppConfig


class StopsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "stops"
