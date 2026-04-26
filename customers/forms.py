"""
Forms for the customers application.

Define model forms to create and edit Customer objects.  Using a
ModelForm enables reuse of validation rules defined in the model and
keeps the form logic simple.
"""

from django import forms

from .models import Customer


class CustomerForm(forms.ModelForm):
    class Meta:
        model = Customer
        fields = [
            "company_name",
            "dba_name",
            "billing_address_line_1",
            "billing_address_line_2",
            "billing_city",
            "billing_state",
            "billing_zip",
            "billing_country",
            "physical_address_line_1",
            "physical_address_line_2",
            "physical_city",
            "physical_state",
            "physical_zip",
            "physical_country",
            "primary_contact_name",
            "primary_contact_phone",
            "primary_contact_email",
            "billing_email",
            "accounting_contact_name",
            "accounting_contact_phone",
            "accounting_contact_email",
            "payment_terms",
            "credit_limit",
            "status",
            "notes",
        ]
        widgets = {
            "notes": forms.Textarea(attrs={"rows": 3}),
        }
