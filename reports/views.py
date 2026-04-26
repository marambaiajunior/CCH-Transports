"""
View classes for the reports application.

Provides accounts receivable reports such as open invoices, past due
invoices, aging summaries and payment histories.
"""

from datetime import date, timedelta

from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Sum, Q
from django.views.generic import TemplateView, ListView

from invoices.models import Invoice, InvoiceStatus
from payments.models import Payment
from customers.models import Customer


class ARSummaryView(LoginRequiredMixin, TemplateView):
    """Display a summary of accounts receivable metrics."""

    template_name = "reports/ar_summary.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        today = date.today()
        # Invoices by status
        context["open_invoices"] = Invoice.objects.filter(status__in=[InvoiceStatus.OPEN, InvoiceStatus.PARTIALLY_PAID])
        context["paid_invoices"] = Invoice.objects.filter(status=InvoiceStatus.PAID)
        context["past_due_invoices"] = Invoice.objects.filter(status=InvoiceStatus.PAST_DUE)
        context["past_due_30"] = Invoice.objects.filter(status=InvoiceStatus.PAST_DUE, due_date__lte=today - timedelta(days=30))
        # Customer balances: annotate sum of balance_due per customer
        customer_balances = Customer.objects.annotate(
            total_balance=Sum("invoices__balance_due", filter=Q(invoices__status__in=[InvoiceStatus.OPEN, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAST_DUE]))
        ).order_by("company_name")
        context["customer_balances"] = customer_balances
        # Payments received this week
        week_start = today - timedelta(days=today.weekday())
        context["payments_this_week"] = Payment.objects.filter(date__gte=week_start, date__lte=today)
        # Payments received this month
        month_start = today.replace(day=1)
        context["payments_this_month"] = Payment.objects.filter(date__gte=month_start, date__lte=today)
        # Aging report buckets
        buckets = [
            (0, 30),
            (31, 60),
            (61, 90),
            (91, 9999),
        ]
        aging = []
        for min_days, max_days in buckets:
            min_due_date = today - timedelta(days=max_days)
            max_due_date = today - timedelta(days=min_days)
            amount = Invoice.objects.filter(
                status__in=[InvoiceStatus.OPEN, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAST_DUE],
                due_date__lt=max_due_date,
                due_date__gte=min_due_date,
            ).aggregate(total=Sum("balance_due"))
            aging.append({
                "range": f"{min_days}-{max_days if max_days != 9999 else '+'}",
                "total": amount["total"] or 0,
            })
        context["aging"] = aging
        return context


# Additional reports for detailed A/R views
class OpenInvoicesView(LoginRequiredMixin, ListView):
    """List all open or partially paid invoices."""
    model = Invoice
    template_name = "reports/open_invoices.html"
    context_object_name = "invoices"

    def get_queryset(self):
        return Invoice.objects.filter(status__in=[InvoiceStatus.OPEN, InvoiceStatus.PARTIALLY_PAID])


class PaidInvoicesView(LoginRequiredMixin, ListView):
    """List all fully paid invoices."""
    model = Invoice
    template_name = "reports/paid_invoices.html"
    context_object_name = "invoices"

    def get_queryset(self):
        return Invoice.objects.filter(status=InvoiceStatus.PAID)


class PastDueInvoicesView(LoginRequiredMixin, ListView):
    """List all invoices past due regardless of age."""
    model = Invoice
    template_name = "reports/past_due_invoices.html"
    context_object_name = "invoices"

    def get_queryset(self):
        return Invoice.objects.filter(status=InvoiceStatus.PAST_DUE)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Compute days past due for each invoice
        today = date.today()
        invoice_days = {}
        for invoice in context["invoices"]:
            if invoice.due_date:
                invoice_days[invoice.pk] = (today - invoice.due_date).days
            else:
                invoice_days[invoice.pk] = None
        context["invoice_days"] = invoice_days
        context["today"] = today
        return context


class PastDue30InvoicesView(LoginRequiredMixin, ListView):
    """List invoices that are more than 30 days past due."""
    model = Invoice
    template_name = "reports/past_due_30_invoices.html"
    context_object_name = "invoices"

    def get_queryset(self):
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)
        return Invoice.objects.filter(status=InvoiceStatus.PAST_DUE, due_date__lte=thirty_days_ago)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        today = date.today()
        invoice_days = {}
        for invoice in context["invoices"]:
            if invoice.due_date:
                invoice_days[invoice.pk] = (today - invoice.due_date).days
            else:
                invoice_days[invoice.pk] = None
        context["invoice_days"] = invoice_days
        return context


class CustomerBalancesView(LoginRequiredMixin, TemplateView):
    """Display total balances per customer."""
    template_name = "reports/customer_balances.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Annotate each customer with the sum of open/partial/past due balances
        customer_balances = Customer.objects.annotate(
            total_balance=Sum(
                "invoices__balance_due",
                filter=Q(invoices__status__in=[InvoiceStatus.OPEN, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAST_DUE]),
            )
        ).order_by("company_name")
        context["customer_balances"] = customer_balances
        return context


class PaymentsThisWeekView(LoginRequiredMixin, TemplateView):
    """List payments received during the current week."""
    template_name = "reports/payments_this_week.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        payments = Payment.objects.filter(date__gte=week_start, date__lte=today)
        context["payments"] = payments
        context["week_start"] = week_start
        context["week_end"] = today
        return context


class PaymentsThisMonthView(LoginRequiredMixin, TemplateView):
    """List payments received during the current month."""
    template_name = "reports/payments_this_month.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        today = date.today()
        month_start = today.replace(day=1)
        payments = Payment.objects.filter(date__gte=month_start, date__lte=today)
        context["payments"] = payments
        context["month_start"] = month_start
        context["month_end"] = today
        return context


class ARAgingView(LoginRequiredMixin, TemplateView):
    """Display an accounts receivable aging report broken into buckets."""
    template_name = "reports/ar_aging.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        today = date.today()
        buckets = [
            (0, 30),
            (31, 60),
            (61, 90),
            (91, 9999),
        ]
        aging = []
        for min_days, max_days in buckets:
            min_due_date = today - timedelta(days=max_days)
            max_due_date = today - timedelta(days=min_days)
            amount = Invoice.objects.filter(
                status__in=[InvoiceStatus.OPEN, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAST_DUE],
                due_date__lt=max_due_date,
                due_date__gte=min_due_date,
            ).aggregate(total=Sum("balance_due"))
            aging.append(
                {
                    "range": f"{min_days}-{max_days if max_days != 9999 else '+'}",
                    "total": amount["total"] or 0,
                }
            )
        context["aging"] = aging
        return context
