"""
View classes for the payments application.

Provide views to record a payment against an invoice and list payments.
"""

from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse_lazy
from django.views import View
from django.views.generic import ListView

from .models import Payment
from .forms import PaymentForm
from invoices.models import Invoice
from audit.models import AuditLog, AuditAction


class PaymentCreateView(LoginRequiredMixin, View):
    """Record a payment for a given invoice."""

    def get(self, request, invoice_pk: int):
        invoice = get_object_or_404(Invoice, pk=invoice_pk)
        form = PaymentForm(initial={"invoice": invoice})
        return render(request, "payments/payment_form.html", {"form": form, "invoice": invoice})

    def post(self, request, invoice_pk: int):
        invoice = get_object_or_404(Invoice, pk=invoice_pk)
        form = PaymentForm(request.POST)
        if form.is_valid():
            payment: Payment = form.save(commit=False)
            payment.invoice = invoice
            payment.created_by = request.user
            payment.updated_by = request.user
            payment.save()
            # Audit log entry for payment
            AuditLog.objects.create(
                user=request.user,
                action=AuditAction.PAYMENT_CREATED,
                content_object=payment,
                message=f"Payment of {payment.amount} recorded for invoice {invoice.number}",
            )
            return redirect("invoices:detail", pk=invoice.pk)
        return render(request, "payments/payment_form.html", {"form": form, "invoice": invoice})


class PaymentListView(LoginRequiredMixin, ListView):
    model = Payment
    paginate_by = 20
    template_name = "payments/payment_list.html"
    context_object_name = "payments"
