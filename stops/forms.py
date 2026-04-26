"""
Forms for the stops application.

Provides a form to create and update Stop objects.  This form is
intended to be used in conjunction with inline formsets on the
Trip create and update pages so that users can define multiple
pickup and delivery stops for each trip.
"""

from django import forms

from .models import Stop


class StopForm(forms.ModelForm):
    """Simple ModelForm for Stop objects.

    The form exposes fields necessary to specify a stop: the
    associated location, the type of stop (pickup or delivery),
    the sequence order within the trip, the scheduled date and any
    internal notes.  A date input widget is provided for the
    scheduled date to improve the user experience.
    """

    class Meta:
        model = Stop
        fields = [
            "location",
            "stop_type",
            "sequence",
            "scheduled_date",
            "notes",
        ]
        widgets = {
            "scheduled_date": forms.DateInput(attrs={"type": "date"}),
            "notes": forms.Textarea(attrs={"rows": 2}),
        }