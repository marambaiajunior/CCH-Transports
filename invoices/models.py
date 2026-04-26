"""
Models for the invoices application.

Defines the Invoice model, which represents a billing document sent
to a customer for a trip.  Each invoice is uniquely numbered (INV-YYYY-000001)
and stores financial information and a PDF representation.  Payments
applied to an invoice update its amount paid and status.
"""

import io
from datetime import date

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import models
from django.template.loader import render_to_string
from django.utils import timezone
from weasyprint import HTML

from core.models import TimeStampedModel
from customers.models import Customer
from trips.models import Trip


class InvoiceStatus(models.TextChoices):
    OPEN = "open", "Open"
    PARTIALLY_PAID = "partial", "Partially Paid"
    PAID = "paid", "Paid"
    PAST_DUE = "past_due", "Past Due"


class Invoice(TimeStampedModel):
    number = models.CharField(max_length=25, unique=True, editable=False)
    trip = models.ForeignKey(Trip, on_delete=models.PROTECT, related_name="invoices")
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="invoices")
    issue_date = models.DateField(default=timezone.now)
    due_date = models.DateField(blank=True, null=True)
    payment_terms = models.CharField(max_length=100, blank=True)
    freight_charge = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    additional_charges = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, editable=False, default=0)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, editable=False, default=0)
    balance_due = models.DecimalField(max_digits=12, decimal_places=2, editable=False, default=0)
    status = models.CharField(max_length=20, choices=InvoiceStatus.choices, default=InvoiceStatus.OPEN)
    pdf = models.FileField(upload_to="invoices/", blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="invoices_created",
        editable=False,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="invoices_updated",
        editable=False,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.number

    @staticmethod
    def generate_number() -> str:
        """Generate the next invoice number for the current year.

        Format: INV-YYYY-000001
        """
        now = timezone.now()
        year = now.strftime("%Y")
        prefix = f"INV-{year}-"
        last_inv = Invoice.objects.filter(number__startswith=prefix).order_by("number").last()
        if last_inv:
            last_seq = int(last_inv.number.split("-")[-1])
        else:
            last_seq = 0
        next_seq = last_seq + 1
        return f"{prefix}{next_seq:06d}"

    def calculate_totals(self) -> None:
        self.total_amount = (self.freight_charge or 0) + (self.additional_charges or 0)
        self.balance_due = (self.total_amount or 0) - (self.amount_paid or 0)

    def update_status(self) -> None:
        """Update invoice status based on balance and due date."""
        self.calculate_totals()
        if self.balance_due <= 0:
            self.status = InvoiceStatus.PAID
        elif self.amount_paid > 0:
            self.status = InvoiceStatus.PARTIALLY_PAID
        else:
            # Determine if past due
            if self.due_date and date.today() > self.due_date:
                self.status = InvoiceStatus.PAST_DUE
            else:
                self.status = InvoiceStatus.OPEN

    def build_pdf_context(self) -> dict:
        pickups = self.trip.stops.filter(stop_type="pickup").order_by("sequence")
        deliveries = self.trip.stops.filter(stop_type="delivery").order_by("sequence")
        from core.models import CompanyProfile
        company_profile = CompanyProfile.objects.first()
        context = {
            "invoice": self,
            "trip": self.trip,
            "customer": self.customer,
            "pickups": pickups,
            "deliveries": deliveries,
            "company_profile": company_profile,
        }
        return context

    def generate_pdf(self) -> None:
        context = self.build_pdf_context()
        html_string = render_to_string("invoices/invoice_pdf.html", context)
        html = HTML(string=html_string, base_url="")
        pdf_bytes = html.write_pdf()
        filename = f"{self.number}.pdf"
        self.pdf.save(filename, ContentFile(pdf_bytes), save=False)

    def save(self, *args, **kwargs):
        # Assign number if not set
        if not self.number:
            self.number = self.generate_number()
        # Set customer to trip's customer if not provided
        if not self.customer_id and self.trip:
            self.customer = self.trip.customer
        # Calculate due date if not set
        if not self.due_date and self.payment_terms:
            try:
                # Expect payment_terms like "30" for 30 days
                days = int(self.payment_terms.split()[0])
                self.due_date = self.issue_date + timezone.timedelta(days=days)
            except Exception:
                # fallback to 30 days
                self.due_date = self.issue_date + timezone.timedelta(days=30)
        # Update totals and status
        self.update_status()
        super().save(*args, **kwargs)
        if not self.pdf:
            self.generate_pdf()
            super().save(update_fields=["pdf"])
