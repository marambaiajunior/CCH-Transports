"""
Forms for the carriers application.

Provides a ModelForm for creating and updating Carrier objects.  The
form uses widgets to improve the appearance of text areas and
date fields.
"""

from django import forms
from .models import Carrier


class CarrierForm(forms.ModelForm):
    class Meta:
        model = Carrier
        fields = [
            "legal_name",
            "dba_name",
            "mc_number",
            "dot_number",
            "address_line_1",
            "address_line_2",
            "city",
            "state",
            "zip_code",
            "country",
            "dispatch_contact_name",
            "dispatch_phone",
            "dispatch_email",
            "accounting_contact_name",
            "accounting_phone",
            "accounting_email",
            "factoring_company",
            "factoring_email",
            "payment_terms",
            "insurance_expiration_date",
            "cargo_insurance_amount",
            "auto_liability_amount",
            "w9_received",
            "carrier_packet_received",
            "status",
            "safety_notes",
            "internal_rating",
            "notes",
        ]
        widgets = {
            "insurance_expiration_date": forms.DateInput(attrs={"type": "date"}),
            "safety_notes": forms.Textarea(attrs={"rows": 3}),
            "notes": forms.Textarea(attrs={"rows": 3}),
        }
