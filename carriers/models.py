"""
Models for the carriers application.

Defines the Carrier model used to store information about motor carriers
that the brokerage hires to move freight.  This includes regulatory
identifiers, contact details, insurance information and compliance
documents.
"""

from django.db import models
from core.models import TimeStampedModel


class CarrierStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    BLOCKED = "blocked", "Blocked"
    INACTIVE = "inactive", "Inactive"


class Carrier(TimeStampedModel):
    legal_name = models.CharField(max_length=255)
    dba_name = models.CharField(max_length=255, blank=True)
    mc_number = models.CharField(max_length=20, blank=True)
    dot_number = models.CharField(max_length=20, blank=True)
    address_line_1 = models.CharField(max_length=255, blank=True)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    zip_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True, default="US")
    dispatch_contact_name = models.CharField(max_length=255, blank=True)
    dispatch_phone = models.CharField(max_length=50, blank=True)
    dispatch_email = models.EmailField(blank=True)
    accounting_contact_name = models.CharField(max_length=255, blank=True)
    accounting_phone = models.CharField(max_length=50, blank=True)
    accounting_email = models.EmailField(blank=True)
    factoring_company = models.CharField(max_length=255, blank=True)
    factoring_email = models.EmailField(blank=True)
    payment_terms = models.CharField(max_length=100, blank=True)
    insurance_expiration_date = models.DateField(blank=True, null=True)
    cargo_insurance_amount = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    auto_liability_amount = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    w9_received = models.BooleanField(default=False)
    carrier_packet_received = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=CarrierStatus.choices,
        default=CarrierStatus.PENDING,
    )
    safety_notes = models.TextField(blank=True)
    internal_rating = models.PositiveSmallIntegerField(blank=True, null=True)
    notes = models.TextField(blank=True)

    def __str__(self) -> str:
        return self.legal_name

    class Meta:
        ordering = ["legal_name"]
