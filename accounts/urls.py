"""
URL patterns for the accounts application.

Expose login and logout routes via Django's built‑in authentication
views.  Additional account management pages can be added here in the
future (e.g., password change, profile update).
"""

from django.urls import path
from django.contrib.auth import views as auth_views
from django.views.generic import TemplateView

app_name = "accounts"

urlpatterns = [
    path(
        "login/",
        auth_views.LoginView.as_view(template_name="accounts/login.html"),
        name="login",
    ),
    path(
        "logout/",
        auth_views.LogoutView.as_view(),
        name="logout",
    ),
    path(
        "profile/",
        TemplateView.as_view(template_name="accounts/profile.html"),
        name="profile",
    ),
]
