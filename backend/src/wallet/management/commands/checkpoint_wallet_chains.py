from django.core.management.base import BaseCommand

from wallet.integrity import checkpoint_all_wallet_chains


class Command(BaseCommand):
    help = "Write external checkpoint files for all valid wallet chains."

    def handle(self, *args, **options):
        paths = checkpoint_all_wallet_chains()
        for path in paths:
            self.stdout.write(str(path))
