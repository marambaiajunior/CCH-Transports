"""
Configuration for the rate_confirmations application.

This app manages rate confirmation documents generated from trips and
linked to carriers.  Each rate confirmation has a unique number and
can generate a PDF for distribution.
"""

from django.apps import AppConfig


class RateConfirmationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "rate_confirmations"
