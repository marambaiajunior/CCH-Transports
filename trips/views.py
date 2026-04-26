"""
View classes for the trips application.

Implements basic CRUD operations for Trip objects using Django's
generic views.  When creating or updating trips, the logged‑in user
is recorded as the creator/updater.  Authentication is required for
all trip pages.
"""

from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.views.generic import ListView, DetailView, CreateView, UpdateView

from .models import Trip
from .forms import TripForm


class TripListView(LoginRequiredMixin, ListView):
    model = Trip
    paginate_by = 20
    template_name = "trips/trip_list.html"
    context_object_name = "trips"


class TripDetailView(LoginRequiredMixin, DetailView):
    model = Trip
    template_name = "trips/trip_detail.html"
    context_object_name = "trip"


class TripCreateView(LoginRequiredMixin, CreateView):
    model = Trip
    form_class = TripForm
    template_name = "trips/trip_form.html"
    success_url = reverse_lazy("trips:list")

    def form_valid(self, form):
        # Set created_by and updated_by to the current user
        form.instance.created_by = self.request.user
        form.instance.updated_by = self.request.user
        return super().form_valid(form)


class TripUpdateView(LoginRequiredMixin, UpdateView):
    model = Trip
    form_class = TripForm
    template_name = "trips/trip_form.html"
    success_url = reverse_lazy("trips:list")

    def form_valid(self, form):
        form.instance.updated_by = self.request.user
        return super().form_valid(form)
