"""
URL configuration for the reports application.

Routes accounts receivable and payment reports.
"""

from django.urls import path
from . import views

app_name = "reports"

urlpatterns = [
    path("ar/", views.ARSummaryView.as_view(), name="ar_summary"),
    path("ar/open/", views.OpenInvoicesView.as_view(), name="open_invoices"),
    path("ar/paid/", views.PaidInvoicesView.as_view(), name="paid_invoices"),
    path("ar/past_due/", views.PastDueInvoicesView.as_view(), name="past_due_invoices"),
    path("ar/past_due_30/", views.PastDue30InvoicesView.as_view(), name="past_due_30_invoices"),
    path("ar/customer_balances/", views.CustomerBalancesView.as_view(), name="customer_balances"),
    path("ar/payments_this_week/", views.PaymentsThisWeekView.as_view(), name="payments_this_week"),
    path("ar/payments_this_month/", views.PaymentsThisMonthView.as_view(), name="payments_this_month"),
    path("ar/aging/", views.ARAgingView.as_view(), name="ar_aging"),
]
