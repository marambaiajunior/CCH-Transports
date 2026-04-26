"""
URL configuration for the payments application.

Routes to record a payment for an invoice and to list payments.
"""

from django.urls import path
from . import views

app_name = "payments"

urlpatterns = [
    path("invoices/<int:invoice_pk>/add/", views.PaymentCreateView.as_view(), name="create"),
    path("", views.PaymentListView.as_view(), name="list"),
]
