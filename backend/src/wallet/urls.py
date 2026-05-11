from django.urls import path

from wallet.views import (
    PaymentIntentConfirmView,
    PaymentIntentCreateView,
    PaymentRequestApproveView,
    PaymentRequestDeclineView,
    PaymentRequestListCreateView,
    SupervisoryApprovalListCreateView,
    TransactionListView,
    WalletBalanceView,
    WalletFundingView,
)


urlpatterns = [
    path("wallet/balance/", WalletBalanceView.as_view(), name="wallet-balance"),
    path("wallet/fund/", WalletFundingView.as_view(), name="wallet-fund"),
    path("payments/intents/", PaymentIntentCreateView.as_view(), name="payment-intent-create"),
    path("payments/intents/<uuid:intent_id>/confirm/", PaymentIntentConfirmView.as_view(), name="payment-intent-confirm"),
    path("payment-requests/", PaymentRequestListCreateView.as_view(), name="payment-request-list-create"),
    path("payment-requests/<uuid:request_id>/approve/", PaymentRequestApproveView.as_view(), name="payment-request-approve"),
    path("payment-requests/<uuid:request_id>/decline/", PaymentRequestDeclineView.as_view(), name="payment-request-decline"),
    path("transactions/", TransactionListView.as_view(), name="transaction-list"),
    path("supervisory-approvals/", SupervisoryApprovalListCreateView.as_view(), name="supervisory-approval-list-create"),
]
