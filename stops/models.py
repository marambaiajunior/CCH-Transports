"""
Models for the stops application.

Defines Location and Stop models used for representing pickup and
delivery points on a trip.  Locations can be reused across multiple
trips, while a Stop references a specific trip and maintains an
ordering through the ``sequence`` field.
"""

from django.db import models

from core.models import TimeStampedModel


class Location(TimeStampedModel):
    name = models.CharField(max_length=255, blank=True)
    company_name = models.CharField(max_length=255, blank=True)
    address_line_1 = models.CharField(max_length=255, blank=True)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    zip_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True, default="US")
    contact_name = models.CharField(max_length=255, blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    contact_email = models.EmailField(blank=True)
    notes = models.TextField(blank=True)

    def __str__(self) -> str:
        return self.name or self.company_name or f"Location {self.pk}"

    class Meta:
        ordering = ["company_name", "name"]


class StopType(models.TextChoices):
    PICKUP = "pickup", "Pickup"
    DELIVERY = "delivery", "Delivery"


class Stop(TimeStampedModel):
    from trips.models import Trip  # imported lazily to avoid circular import

    trip = models.ForeignKey("trips.Trip", on_delete=models.CASCADE, related_name="stops")
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name="stops")
    stop_type = models.CharField(max_length=10, choices=StopType.choices)
    sequence = models.PositiveIntegerField(help_text="Order of the stop on the trip")
    scheduled_date = models.DateField(blank=True, null=True)
    actual_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["sequence"]
        unique_together = [("trip", "sequence")]

    def __str__(self) -> str:
        return f"{self.get_stop_type_display()} stop {self.sequence} for {self.trip.trip_number}"
