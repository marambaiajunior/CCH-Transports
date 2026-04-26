"""
Configuration for the invoices application.

This app manages customer invoices generated from trips.  Each invoice
has a unique number, links to a trip, and stores a PDF for
distribution.  The application also tracks payment status and due
dates for accounts receivable.
"""

from django.apps import AppConfig


class InvoicesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "invoices"
