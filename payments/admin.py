"""
Admin registrations for the payments application.

Registers the Payment model and displays key information.
"""

from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "number",
        "invoice",
        "date",
        "amount",
        "created_by",
    )
    list_filter = ("date",)
    search_fields = ("number", "invoice__number")
    readonly_fields = ("number",)
