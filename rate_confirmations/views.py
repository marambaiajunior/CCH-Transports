"""
View classes for the rate_confirmations application.

Includes views to generate a rate confirmation from a trip and to
display a confirmation's details.
"""

from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse_lazy
from django.views import View
from django.views.generic import DetailView, ListView

from .models import RateConfirmation
from trips.models import Trip


class GenerateRateConfirmationView(LoginRequiredMixin, View):
    """Create a new rate confirmation for the given trip and redirect to its detail view."""

    def get(self, request, trip_pk: int):
        trip = get_object_or_404(Trip, pk=trip_pk)
        rc = RateConfirmation.objects.create(
            trip=trip,
            carrier=trip.carrier,
            created_by=request.user,
            updated_by=request.user,
        )
        # PDF generation occurs in model save
        return redirect("rate_confirmations:detail", pk=rc.pk)


class RateConfirmationDetailView(LoginRequiredMixin, DetailView):
    model = RateConfirmation
    template_name = "rate_confirmations/rate_confirmation_detail.html"
    context_object_name = "rate_confirmation"


class RateConfirmationListView(LoginRequiredMixin, ListView):
    model = RateConfirmation
    paginate_by = 20
    template_name = "rate_confirmations/rate_confirmation_list.html"
    context_object_name = "rate_confirmations"
