"""
Models for the rate_confirmations application.

The RateConfirmation model represents a carrier agreement generated from a
Trip.  It assigns a unique number (RC-YYYY-000001) and stores a PDF
representation for distribution.  Rate confirmations are linked to
both the trip and the carrier.
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
from trips.models import Trip
from carriers.models import Carrier


class RateConfirmation(TimeStampedModel):
    number = models.CharField(max_length=20, unique=True, editable=False)
    trip = models.ForeignKey(Trip, on_delete=models.PROTECT, related_name="rate_confirmations")
    carrier = models.ForeignKey(Carrier, on_delete=models.PROTECT, related_name="rate_confirmations")
    revision = models.PositiveIntegerField(default=1)
    pdf = models.FileField(upload_to="rate_confirmations/", blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="rate_confirmations_created",
        editable=False,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="rate_confirmations_updated",
        editable=False,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.number

    @staticmethod
    def generate_number() -> str:
        """Generate the next rate confirmation number for the current year.

        Format: RC-YYYY-000001
        """
        now = timezone.now()
        year = now.strftime("%Y")
        prefix = f"RC-{year}-"
        last_rc = RateConfirmation.objects.filter(number__startswith=prefix).order_by("number").last()
        if last_rc:
            last_seq = int(last_rc.number.split("-")[-1])
        else:
            last_seq = 0
        next_seq = last_seq + 1
        return f"{prefix}{next_seq:06d}"

    def build_pdf_context(self) -> dict:
        """Assemble context data for PDF template rendering."""
        # Determine pickup and delivery stops in order
        pickups = self.trip.stops.filter(stop_type="pickup").order_by("sequence")
        deliveries = self.trip.stops.filter(stop_type="delivery").order_by("sequence")
        context = {
            "rate_confirmation": self,
            "trip": self.trip,
            "carrier": self.carrier,
            "pickups": pickups,
            "deliveries": deliveries,
        }
        return context

    def generate_pdf(self) -> None:
        """Render a PDF for this rate confirmation and save it to the pdf field."""
        context = self.build_pdf_context()
        html_string = render_to_string("rate_confirmations/rate_confirmation_pdf.html", context)
        html = HTML(string=html_string, base_url="")
        pdf_bytes = html.write_pdf()
        filename = f"{self.number}.pdf"
        self.pdf.save(filename, ContentFile(pdf_bytes), save=False)

    def save(self, *args, **kwargs):
        # Assign number if not set
        if not self.number:
            self.number = self.generate_number()
        # Ensure trip's carrier matches
        if not self.carrier_id:
            self.carrier = self.trip.carrier
        # Generate PDF if not set or if revision changed
        super().save(*args, **kwargs)
        if not self.pdf:
            self.generate_pdf()
            # Save again to store PDF
            super().save(update_fields=["pdf"])
