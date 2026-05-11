COMPOSE := docker compose
WAZUH_CERTS := monitoring/wazuh/config/wazuh_indexer_ssl_certs/root-ca.pem

.PHONY: up up-full-backend backend down logs shell migrate makemigrations superuser test monitor-init monitor-up monitor-down monitor-logs

up:
	@if [ ! -f "$(WAZUH_CERTS)" ]; then \
		echo "Generating Wazuh certificates..."; \
		$(COMPOSE) -f monitoring/wazuh/generate-indexer-certs.yml run --rm generator; \
	fi
	$(COMPOSE) up --build

up-full-backend:
	@if [ ! -f "$(WAZUH_CERTS)" ]; then \
		echo "Generating Wazuh certificates..."; \
		$(COMPOSE) -f monitoring/wazuh/generate-indexer-certs.yml run --rm generator; \
	fi
	$(COMPOSE) up -d --build
	$(COMPOSE) logs -f backend

backend:
	$(COMPOSE) up --build backend db

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f backend db

shell:
	$(COMPOSE) exec backend bash

migrate:
	$(COMPOSE) exec backend python manage.py migrate

makemigrations:
	$(COMPOSE) exec backend python manage.py makemigrations

superuser:
	$(COMPOSE) exec backend python manage.py createsuperuser

test:
	$(COMPOSE) exec backend python manage.py test tests

monitor-init:
	$(COMPOSE) -f monitoring/wazuh/generate-indexer-certs.yml run --rm generator

monitor-up:
	@if [ ! -f "$(WAZUH_CERTS)" ]; then \
		echo "Generating Wazuh certificates..."; \
		$(COMPOSE) -f monitoring/wazuh/generate-indexer-certs.yml run --rm generator; \
	fi
	$(COMPOSE) up -d wazuh.indexer wazuh.manager wazuh.dashboard wazuh.agent

monitor-down:
	$(COMPOSE) stop wazuh.agent wazuh.dashboard wazuh.manager wazuh.indexer

monitor-logs:
	$(COMPOSE) logs -f wazuh.agent wazuh.manager wazuh.indexer wazuh.dashboard
