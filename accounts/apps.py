"""
Configuration for the accounts application.

This app encapsulates user management functionality including login,
logout, and (in future phases) role administration.  It relies on
Django's built‑in authentication system and groups for role‑based
permissions.
"""

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"
