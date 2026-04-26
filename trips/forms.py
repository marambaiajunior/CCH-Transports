"""
Forms for the trips application.

Provide a ModelForm for creating and updating Trip objects.  Fields
that are automatically managed (such as trip_number and margins) are
excluded from direct user input.
"""

from django import forms
from django.forms import inlineformset_factory

from stops.forms import StopForm
from stops.models import Stop
from .models import Trip


class TripForm(forms.ModelForm):
    class Meta:
        model = Trip
        exclude = [
            "trip_number",
            "gross_margin",
            "margin_percentage",
            "created_by",
            "updated_by",
        ]
        widgets = {
            "pickup_date": forms.DateInput(attrs={"type": "date"}),
            "delivery_date": forms.DateInput(attrs={"type": "date"}),
            "special_instructions": forms.Textarea(attrs={"rows": 3}),
            "internal_notes": forms.Textarea(attrs={"rows": 3}),
            "customer_notes": forms.Textarea(attrs={"rows": 3}),
        }


# Define an inline formset for managing stops on a trip.
#
# We expose the StopForm defined in the stops app so that the
# trip create and update views can render multiple pickup and delivery
# stops.  The extra parameter determines how many blank forms are
# initially displayed; users can add or remove rows as needed.
StopFormSet = inlineformset_factory(
    Trip,
    Stop,
    form=StopForm,
    extra=2,
    can_delete=True,
)
