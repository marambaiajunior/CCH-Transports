"""
URL configuration for the carriers application.

Routes carrier management views including list, create, detail and
update pages.  All views require the user to be authenticated.
"""

from django.urls import path

from . import views

app_name = "carriers"

urlpatterns = [
    path("", views.CarrierListView.as_view(), name="list"),
    path("add/", views.CarrierCreateView.as_view(), name="create"),
    path("<int:pk>/", views.CarrierDetailView.as_view(), name="detail"),
    path("<int:pk>/edit/", views.CarrierUpdateView.as_view(), name="update"),
]
