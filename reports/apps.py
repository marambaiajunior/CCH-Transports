"""
Configuration for the reports application.

This app provides financial and operational reports such as accounts
receivable aging, open invoices and payment history.
"""

from django.apps import AppConfig


class ReportsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "reports"
