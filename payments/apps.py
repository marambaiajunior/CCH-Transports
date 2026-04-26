"""
Configuration for the payments application.

This app handles customer payments applied to invoices.  Payments
automatically update the associated invoice's amount paid, balance and
status.
"""

from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "payments"
