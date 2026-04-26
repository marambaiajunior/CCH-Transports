"""
Admin registrations for the invoices application.

Registers the Invoice model with read‑only number and PDF fields.
"""

from django.contrib import admin
from .models import Invoice


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = (
        "number",
        "trip",
        "customer",
        "issue_date",
        "due_date",
        "total_amount",
        "amount_paid",
        "balance_due",
        "status",
    )
    list_filter = ("status", "due_date")
    search_fields = (
        "number",
        "trip__trip_number",
        "customer__company_name",
    )
    readonly_fields = ("number", "pdf", "total_amount", "amount_paid", "balance_due", "status")
