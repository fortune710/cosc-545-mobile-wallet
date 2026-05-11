from django.contrib import admin

from wallet.models import (
    PaymentIntent,
    PaymentRequest,
    SupervisoryApproval,
    Transaction,
    TransactionReceipt,
    Wallet,
)


admin.site.register(Wallet)
admin.site.register(Transaction)
admin.site.register(TransactionReceipt)
admin.site.register(PaymentIntent)
admin.site.register(PaymentRequest)
admin.site.register(SupervisoryApproval)
