"""
Admin registrations for the stops application.

Register Location and Stop models so they can be managed via the
Django admin interface.  List displays expose key fields and
sequence ordering for stops.
"""

from django.contrib import admin

from .models import Location, Stop


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = (
        "company_name",
        "name",
        "city",
        "state",
        "contact_name",
        "contact_phone",
    )
    search_fields = (
        "company_name",
        "name",
        "city",
        "state",
        "contact_name",
    )


@admin.register(Stop)
class StopAdmin(admin.ModelAdmin):
    list_display = (
        "trip",
        "stop_type",
        "sequence",
        "location",
        "scheduled_date",
        "actual_date",
    )
    list_filter = ("stop_type",)
    search_fields = (
        "trip__trip_number",
        "location__company_name",
        "location__name",
    )
