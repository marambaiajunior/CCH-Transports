"""
URL configuration for the trips application.

Routes trip management views including list, create, detail and
update pages.  All views require the user to be authenticated.
"""

from django.urls import path
from . import views

app_name = "trips"

urlpatterns = [
    path("", views.TripListView.as_view(), name="list"),
    path("add/", views.TripCreateView.as_view(), name="create"),
    path("<int:pk>/", views.TripDetailView.as_view(), name="detail"),
    path("<int:pk>/edit/", views.TripUpdateView.as_view(), name="update"),
]
