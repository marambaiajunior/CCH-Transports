"""
View classes for the carriers application.

Provides list, detail, create and update views for Carrier objects.
Authentication is required for all carrier pages.
"""

from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.views.generic import ListView, DetailView, CreateView, UpdateView

from .models import Carrier
from .forms import CarrierForm


class CarrierListView(LoginRequiredMixin, ListView):
    model = Carrier
    paginate_by = 20
    template_name = "carriers/carrier_list.html"
    context_object_name = "carriers"


class CarrierDetailView(LoginRequiredMixin, DetailView):
    model = Carrier
    template_name = "carriers/carrier_detail.html"
    context_object_name = "carrier"


class CarrierCreateView(LoginRequiredMixin, CreateView):
    model = Carrier
    form_class = CarrierForm
    template_name = "carriers/carrier_form.html"
    success_url = reverse_lazy("carriers:list")


class CarrierUpdateView(LoginRequiredMixin, UpdateView):
    model = Carrier
    form_class = CarrierForm
    template_name = "carriers/carrier_form.html"
    success_url = reverse_lazy("carriers:list")
