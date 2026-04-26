"""
Forms for the payments application.

Provide a ModelForm for recording customer payments.  The payment
number is generated automatically and excluded from the form.
"""

from django import forms
from .models import Payment


class PaymentForm(forms.ModelForm):
    class Meta:
        model = Payment
        exclude = ["number", "created_by", "updated_by"]
        widgets = {
            "date": forms.DateInput(attrs={"type": "date"}),
        }
