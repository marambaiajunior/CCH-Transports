"""
URL configuration for the invoices application.

Routes invoice creation from trips, list and detail views.
"""

from django.urls import path
from . import views

app_name = "invoices"

urlpatterns = [
    path("trips/<int:trip_pk>/create/", views.GenerateInvoiceView.as_view(), name="create"),
    path("<int:pk>/", views.InvoiceDetailView.as_view(), name="detail"),
    path("", views.InvoiceListView.as_view(), name="list"),
]
