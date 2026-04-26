"""
Admin registrations for the core application.

Register models defined in core/models.py so that they can be managed via
the Django admin interface.
"""

from django.contrib import admin

from .models import CompanyProfile


@admin.register(CompanyProfile)
class CompanyProfileAdmin(admin.ModelAdmin):
    list_display = (
        "company_name",
        "city",
        "state",
        "phone",
        "email",
    )
