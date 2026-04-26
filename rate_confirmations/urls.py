"""
URL configuration for the rate_confirmations application.

Provides routes to generate a new rate confirmation from a trip and to
view existing confirmations.
"""

from django.urls import path

from . import views

app_name = "rate_confirmations"

urlpatterns = [
    path("", views.RateConfirmationListView.as_view(), name="list"),
    path("trips/<int:trip_pk>/create/", views.GenerateRateConfirmationView.as_view(), name="create"),
    path("<int:pk>/", views.RateConfirmationDetailView.as_view(), name="detail"),
]
