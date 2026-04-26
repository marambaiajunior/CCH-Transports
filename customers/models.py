"""
Models for the customers application.

Defines the Customer model used to store detailed information about
freight brokerage customers, including billing and physical addresses,
contact persons and payment terms.  The Customer model inherits
timestamps from the core TimeStampedModel.
"""

from django.db import models
from core.models import TimeStampedModel


class CustomerStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"
    BLOCKED = "blocked", "Blocked"
    CREDIT_HOLD = "credit_hold", "Credit Hold"


class Customer(TimeStampedModel):
    company_name = models.CharField(max_length=255)
    dba_name = models.CharField(max_length=255, blank=True)
    # Billing address
    billing_address_line_1 = models.CharField(max_length=255, blank=True)
    billing_address_line_2 = models.CharField(max_length=255, blank=True)
    billing_city = models.CharField(max_length=100, blank=True)
    billing_state = models.CharField(max_length=100, blank=True)
    billing_zip = models.CharField(max_length=20, blank=True)
    billing_country = models.CharField(max_length=100, blank=True, default="US")
    # Physical address
    physical_address_line_1 = models.CharField(max_length=255, blank=True)
    physical_address_line_2 = models.CharField(max_length=255, blank=True)
    physical_city = models.CharField(max_length=100, blank=True)
    physical_state = models.CharField(max_length=100, blank=True)
    physical_zip = models.CharField(max_length=20, blank=True)
    physical_country = models.CharField(max_length=100, blank=True, default="US")
    # Primary contact
    primary_contact_name = models.CharField(max_length=255, blank=True)
    primary_contact_phone = models.CharField(max_length=50, blank=True)
    primary_contact_email = models.EmailField(blank=True)
    # Billing contact
    billing_email = models.EmailField(blank=True)
    accounting_contact_name = models.CharField(max_length=255, blank=True)
    accounting_contact_phone = models.CharField(max_length=50, blank=True)
    accounting_contact_email = models.EmailField(blank=True)
    # Financials
    payment_terms = models.CharField(max_length=100, blank=True)
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(
        max_length=20,
        choices=CustomerStatus.choices,
        default=CustomerStatus.ACTIVE,
    )
    notes = models.TextField(blank=True)

    def __str__(self) -> str:
        return self.company_name

    class Meta:
        ordering = ["company_name"]
