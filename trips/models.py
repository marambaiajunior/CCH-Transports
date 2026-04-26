"""
Models for the trips application.

Defines the Trip model, representing the core operational record in
the TMS.  A Trip holds information about the customer, carrier,
assigned broker and dispatcher, equipment, rates, dates and statuses.
Trip numbers are generated automatically per year.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import TimeStampedModel
from customers.models import Customer
from carriers.models import Carrier


class TripStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    BOOKED = "booked", "Booked"
    IN_TRANSIT = "in_transit", "In Transit"
    DELIVERED = "delivered", "Delivered"
    CLOSED = "closed", "Closed"


class Trip(TimeStampedModel):
    trip_number = models.CharField(max_length=20, unique=True, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="trips")
    carrier = models.ForeignKey(Carrier, on_delete=models.PROTECT, related_name="trips")
    broker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="brokered_trips")
    dispatcher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="dispatched_trips",
    )
    status = models.CharField(max_length=20, choices=TripStatus.choices, default=TripStatus.DRAFT)
    equipment_type = models.CharField(max_length=100, blank=True)
    commodity = models.CharField(max_length=255, blank=True)
    total_weight = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    dimensions = models.CharField(max_length=255, blank=True)
    piece_count = models.PositiveIntegerField(blank=True, null=True)
    customer_rate = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    carrier_rate = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    gross_margin = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    margin_percentage = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    pickup_date = models.DateField(blank=True, null=True)
    delivery_date = models.DateField(blank=True, null=True)
    pickup_number = models.CharField(max_length=100, blank=True)
    delivery_reference = models.CharField(max_length=100, blank=True)
    driver_name = models.CharField(max_length=255, blank=True)
    driver_phone = models.CharField(max_length=50, blank=True)
    truck_number = models.CharField(max_length=50, blank=True)
    trailer_number = models.CharField(max_length=50, blank=True)
    special_instructions = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)
    customer_notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="trips_created",
        editable=False,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="trips_updated",
        editable=False,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.trip_number

    @staticmethod
    def generate_trip_number() -> str:
        """Generate the next trip number for the current year.

        Trip numbers follow the pattern YYNNNN where YY is the two‑digit
        year and NNNN is a zero‑padded sequence that resets every year.
        """
        now = timezone.now()
        year_suffix = now.strftime("%y")
        prefix = f"{year_suffix}"
        last_trip = Trip.objects.filter(trip_number__startswith=prefix).order_by("trip_number").last()
        if last_trip:
            # Extract numeric suffix
            last_number_str = last_trip.trip_number[2:]
            try:
                last_number = int(last_number_str)
            except ValueError:
                last_number = 0
        else:
            last_number = 0
        next_number = last_number + 1
        return f"{prefix}{next_number:04d}"

    def calculate_margins(self) -> None:
        """Compute gross margin and margin percentage based on rates."""
        if self.customer_rate is not None and self.carrier_rate is not None:
            self.gross_margin = self.customer_rate - self.carrier_rate
            if self.customer_rate > 0:
                self.margin_percentage = (self.gross_margin / self.customer_rate) * 100
            else:
                self.margin_percentage = 0
        else:
            self.gross_margin = None
            self.margin_percentage = None

    def save(self, *args, **kwargs):
        # Assign a trip number on first save
        if not self.trip_number:
            self.trip_number = self.generate_trip_number()
        # Compute margins
        self.calculate_margins()
        super().save(*args, **kwargs)
