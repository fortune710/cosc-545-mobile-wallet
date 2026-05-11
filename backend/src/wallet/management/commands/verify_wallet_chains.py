from django.core.management.base import BaseCommand, CommandError

from wallet.integrity import verify_all_wallet_chains


class Command(BaseCommand):
    help = "Verify tamper-evident transaction chains for all wallets."

    def handle(self, *args, **options):
        results = verify_all_wallet_chains()
        invalid_results = [result for result in results if not result.is_valid]
        for result in results:
            self.stdout.write(
                f"wallet={result.wallet_id} valid={result.is_valid} tx_count={result.transaction_count} "
                f"last_seq={result.last_sequence_number} reason={result.failure_reason or 'ok'}"
            )
        if invalid_results:
            raise CommandError(f"{len(invalid_results)} wallet chains failed verification.")
