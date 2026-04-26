"""
Core models and mixins for the CCH Logistics TMS.

This module provides abstract base classes that can be inherited by
other models in the project, as well as concrete models that are
centrally used across multiple apps (e.g., the company profile).
"""

from django.db import models


class TimeStampedModel(models.Model):
    """Abstract base class that tracks creation and modification times.

    All models inheriting from this class will automatically have
    ``created_at`` and ``updated_at`` fields populated when a record
    is first created and whenever it is modified.
    """

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class CompanyProfile(TimeStampedModel):
    """Stores company configuration details for invoices and rate confirmations.

    A freight brokerage may have many operational records, but typically
    only a single company profile.  The profile holds contact and
    remittance information that will be rendered on PDFs and used
    throughout the system.
    """

    company_name = models.CharField(max_length=255, default="CCH Logistics")
    address_line_1 = models.CharField(max_length=255, blank=True)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    zip_code = models.CharField(max_length=20, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    website = models.CharField(max_length=255, blank=True)
    logo = models.ImageField(upload_to="company_logos/", blank=True, null=True)
    remittance_instructions = models.TextField(blank=True)
    default_payment_terms = models.CharField(max_length=100, blank=True)
    invoice_footer_notes = models.TextField(blank=True)
    rate_confirmation_terms = models.TextField(blank=True)

    def __str__(self) -> str:
        return self.company_name

    class Meta:
        verbose_name = "Company Profile"
        verbose_name_plural = "Company Profiles"
