"""
Admin registrations for the rate_confirmations application.

Registers the RateConfirmation model with a read‑only number and links.
"""

from django.contrib import admin
from .models import RateConfirmation


@admin.register(RateConfirmation)
class RateConfirmationAdmin(admin.ModelAdmin):
    list_display = ("number", "trip", "carrier", "revision", "created_at")
    readonly_fields = ("number", "pdf")
    list_filter = ("carrier",)
    search_fields = ("number", "trip__trip_number", "carrier__legal_name")
