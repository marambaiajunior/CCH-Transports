"""
Configuration for the trips application.

This app manages the core operational record of the brokerage—the
Trip (or Load).  Each Trip contains information about the shipper,
carrier, equipment, dates, rates and status.
"""

from django.apps import AppConfig


class TripsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "trips"
