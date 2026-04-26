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
from .forms import TripForm, StopFormSet


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
        """Save the trip and any associated stops submitted via the formset.

        This method assigns the current user to the created_by and
        updated_by fields, validates the inline stop formset and
        persists it alongside the trip.  If the stop formset fails
        validation the trip will not be saved and the form is
        re-rendered with error messages.
        """
        context = self.get_context_data()
        stop_formset = context.get("stop_formset")
        # assign current user
        form.instance.created_by = self.request.user
        form.instance.updated_by = self.request.user
        # Validate stop formset first
        if stop_formset is not None and stop_formset.is_valid():
            # Save trip
            response = super().form_valid(form)
            # Associate and save stops
            stop_formset.instance = self.object
            stop_formset.save()
            return response
        else:
            return self.form_invalid(form)

    def get_context_data(self, **kwargs):
        """Provide an inline formset for stops when rendering the form.

        On GET a blank formset with a couple of empty stop forms is
        provided.  On POST the formset is bound to the submitted
        data so that validation errors can be displayed.
        """
        context = super().get_context_data(**kwargs)
        if self.request.method == "POST":
            context["stop_formset"] = StopFormSet(self.request.POST)
        else:
            context["stop_formset"] = StopFormSet()
        return context


class TripUpdateView(LoginRequiredMixin, UpdateView):
    model = Trip
    form_class = TripForm
    template_name = "trips/trip_form.html"
    success_url = reverse_lazy("trips:list")

    def form_valid(self, form):
        """Update the trip and its associated stops.

        Similar to the create view, this method assigns the current
        user to updated_by, validates and saves the stop formset and
        then saves the trip.  If validation fails the form is
        re-rendered.
        """
        context = self.get_context_data()
        stop_formset = context.get("stop_formset")
        form.instance.updated_by = self.request.user
        if stop_formset is not None and stop_formset.is_valid():
            response = super().form_valid(form)
            stop_formset.instance = self.object
            stop_formset.save()
            return response
        else:
            return self.form_invalid(form)

    def get_context_data(self, **kwargs):
        """Bind the stop formset to the existing trip instance.

        On GET the formset is initialized with the current stops; on
        POST it is bound to the submitted data and the instance so
        that edits and deletions are preserved.
        """
        context = super().get_context_data(**kwargs)
        if self.request.method == "POST":
            context["stop_formset"] = StopFormSet(self.request.POST, instance=self.object)
        else:
            context["stop_formset"] = StopFormSet(instance=self.object)
        return context
