"""
Admin registrations for the customers application.

Provides list display and search functionality for customers in the
admin interface.
"""

from django.contrib import admin
from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = (
        "company_name",
        "dba_name",
        "primary_contact_name",
        "primary_contact_phone",
        "status",
    )
    list_filter = ("status",)
    search_fields = (
        "company_name",
        "dba_name",
        "primary_contact_name",
        "primary_contact_phone",
    )
