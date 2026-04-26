"""
Models for the payments application.

Defines the Payment model, representing a customer payment applied to
an invoice.  Each payment has a unique number (PAY-YYYY-000001) and
automatically updates the invoice's paid amount and status.
"""

from datetime import date

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import TimeStampedModel
from invoices.models import Invoice


class Payment(TimeStampedModel):
    number = models.CharField(max_length=25, unique=True, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="payments")
    date = models.DateField(default=timezone.now)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="payments_created",
        editable=False,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="payments_updated",
        editable=False,
    )

    class Meta:
        ordering = ["-date"]

    def __str__(self) -> str:
        return self.number

    @staticmethod
    def generate_number() -> str:
        now = timezone.now()
        year = now.strftime("%Y")
        prefix = f"PAY-{year}-"
        last_payment = Payment.objects.filter(number__startswith=prefix).order_by("number").last()
        if last_payment:
            last_seq = int(last_payment.number.split("-")[-1])
        else:
            last_seq = 0
        next_seq = last_seq + 1
        return f"{prefix}{next_seq:06d}"

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = self.generate_number()
        super().save(*args, **kwargs)
        # After saving, update invoice amounts
        invoice = self.invoice
        invoice.amount_paid = (invoice.amount_paid or 0) + (self.amount or 0)
        invoice.update_status()
        invoice.save(update_fields=["amount_paid", "balance_due", "status", "updated_at"])
