"""
Forms for the invoices application.

Provide a ModelForm for creating and editing Invoice objects.  Fields
that are automatically calculated (numbers, totals, amounts) are
excluded.
"""

from django import forms
from .models import Invoice


class InvoiceForm(forms.ModelForm):
    class Meta:
        model = Invoice
        exclude = [
            "number",
            "total_amount",
            "amount_paid",
            "balance_due",
            "status",
            "pdf",
            "created_by",
            "updated_by",
        ]
        widgets = {
            "issue_date": forms.DateInput(attrs={"type": "date"}),
            "due_date": forms.DateInput(attrs={"type": "date"}),
            "payment_terms": forms.TextInput(),
        }
