"""
View classes for the invoices application.

Implements views to generate an invoice from a trip, display invoice
details and list invoices.  Authentication is required for all
invoice pages.
"""

from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404, redirect
from django.views import View
from django.views.generic import DetailView, ListView

from .models import Invoice
from trips.models import Trip
from audit.models import AuditLog, AuditAction


class GenerateInvoiceView(LoginRequiredMixin, View):
    """Create a new invoice for a given trip and redirect to detail."""

    def get(self, request, trip_pk: int):
        trip = get_object_or_404(Trip, pk=trip_pk)
        # Use trip rates as default charges
        freight_charge = trip.customer_rate or 0
        additional = 0
        invoice = Invoice.objects.create(
            trip=trip,
            customer=trip.customer,
            freight_charge=freight_charge,
            additional_charges=additional,
            payment_terms=trip.customer.payment_terms,
            created_by=request.user,
            updated_by=request.user,
        )
        # Record audit log entry
        AuditLog.objects.create(
            user=request.user,
            action=AuditAction.INVOICE_CREATED,
            content_object=invoice,
            message=f"Invoice {invoice.number} created for trip {trip.trip_number}",
        )
        return redirect("invoices:detail", pk=invoice.pk)


class InvoiceDetailView(LoginRequiredMixin, DetailView):
    model = Invoice
    template_name = "invoices/invoice_detail.html"
    context_object_name = "invoice"


class InvoiceListView(LoginRequiredMixin, ListView):
    model = Invoice
    paginate_by = 20
    template_name = "invoices/invoice_list.html"
    context_object_name = "invoices"
