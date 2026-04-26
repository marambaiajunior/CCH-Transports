from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from carriers.models import Carrier, CarrierStatus
from customers.models import Customer, CustomerStatus
from trips.models import Trip, TripStatus


class Command(BaseCommand):
    help = (
        "Create or update a minimal demo dataset: admin user, one customer, "
        "one carrier and one trip. Safe to run multiple times."
    )

    def add_arguments(self, parser):
        parser.add_argument("--username", default="demo_admin")
        parser.add_argument("--email", default="demo.admin@cchlogistics.com")
        parser.add_argument("--password", default="Demo@123456")

    @transaction.atomic
    def handle(self, *args, **options):
        username = options["username"]
        email = options["email"]
        password = options["password"]

        user_model = get_user_model()
        admin_user, created = user_model.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "is_staff": True,
                "is_superuser": True,
            },
        )

        # Ensure admin permissions and update credentials if user already existed.
        admin_user.email = email
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.set_password(password)
        admin_user.save()

        customer, _ = Customer.objects.get_or_create(
            company_name="Acme Foods Distribution",
            defaults={
                "billing_address_line_1": "100 Market St",
                "billing_city": "Denver",
                "billing_state": "CO",
                "billing_zip": "80202",
                "primary_contact_name": "Jordan Miller",
                "primary_contact_phone": "+1-303-555-0101",
                "primary_contact_email": "shipping@acmefoods.com",
                "payment_terms": "Net 30",
                "status": CustomerStatus.ACTIVE,
            },
        )

        carrier, _ = Carrier.objects.get_or_create(
            legal_name="Front Range Trucking LLC",
            defaults={
                "mc_number": "MC123456",
                "dot_number": "USDOT987654",
                "dispatch_contact_name": "Casey Johnson",
                "dispatch_phone": "+1-720-555-0110",
                "dispatch_email": "dispatch@frtrucking.com",
                "payment_terms": "Quick Pay 7",
                "status": CarrierStatus.APPROVED,
                "carrier_packet_received": True,
                "w9_received": True,
            },
        )

        pickup_date = timezone.localdate() + timedelta(days=1)
        delivery_date = pickup_date + timedelta(days=2)

        trip = (
            Trip.objects.filter(customer=customer, carrier=carrier)
            .order_by("created_at")
            .first()
        )

        if trip is None:
            trip = Trip(
                customer=customer,
                carrier=carrier,
                broker=admin_user,
                dispatcher=admin_user,
                status=TripStatus.BOOKED,
                equipment_type="Dry Van 53'",
                commodity="Palletized food products",
                total_weight=42000,
                customer_rate=2500,
                carrier_rate=1900,
                pickup_date=pickup_date,
                delivery_date=delivery_date,
                pickup_number="PU-10001",
                delivery_reference="DEL-20001",
                special_instructions="Check in with shipping dock 30 minutes early.",
                created_by=admin_user,
                updated_by=admin_user,
            )
        else:
            trip.broker = admin_user
            trip.dispatcher = admin_user
            trip.updated_by = admin_user

        trip.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f"Admin user created: {username}"))
        else:
            self.stdout.write(self.style.WARNING(f"Admin user updated: {username}"))

        self.stdout.write(self.style.SUCCESS(f"Customer ready: {customer.company_name}"))
        self.stdout.write(self.style.SUCCESS(f"Carrier ready: {carrier.legal_name}"))
        self.stdout.write(self.style.SUCCESS(f"Trip ready: {trip.trip_number}"))
