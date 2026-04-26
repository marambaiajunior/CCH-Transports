"""
Configuration for the customers application.

This app manages freight brokerage customers including their billing and
physical addresses, contact details, credit status and general notes.
"""

from django.apps import AppConfig


class CustomersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "customers"
