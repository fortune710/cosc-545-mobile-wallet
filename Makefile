COMPOSE := docker compose

.PHONY: up down logs shell migrate makemigrations superuser test

up:
	$(COMPOSE) up --build

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
