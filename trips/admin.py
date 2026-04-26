"""
Admin registrations for the trips application.

Provides list display and search functionality for Trip objects in the
admin interface.  The trip number is read‑only and margins are
calculated automatically.
"""

from django.contrib import admin
from .models import Trip


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = (
        "trip_number",
        "customer",
        "carrier",
        "status",
        "customer_rate",
        "carrier_rate",
        "gross_margin",
        "margin_percentage",
        "pickup_date",
        "delivery_date",
    )
    list_filter = ("status", "pickup_date", "delivery_date")
    search_fields = ("trip_number", "customer__company_name", "carrier__legal_name")
    readonly_fields = ("trip_number", "gross_margin", "margin_percentage")
