"""
Admin registrations for the carriers application.

This configuration determines how Carrier objects appear in the Django
administration site.  Important fields are displayed and filters are
provided for status and document receipt.
"""

from django.contrib import admin
from .models import Carrier


@admin.register(Carrier)
class CarrierAdmin(admin.ModelAdmin):
    list_display = (
        "legal_name",
        "dba_name",
        "mc_number",
        "dispatch_contact_name",
        "dispatch_phone",
        "status",
    )
    list_filter = (
        "status",
        "w9_received",
        "carrier_packet_received",
    )
    search_fields = (
        "legal_name",
        "dba_name",
        "mc_number",
        "dispatch_contact_name",
        "dispatch_phone",
    )
