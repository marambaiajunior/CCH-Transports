# CCH Logistics TMS

## GitHub Pages (demo imediato)

Este repositório agora inclui uma versão **front-end demo** em `index.html` para
rodar diretamente no GitHub Pages sem backend. Ela oferece cadastros básicos
(clientes, transportadoras, viagens, faturas, pagamentos) e relatórios simples,
persistindo dados no navegador via LocalStorage.

> URL esperada após publicação: `https://marambaiajunior.github.io/CCH-Transports/`

Para ambiente de produção multiusuário com autenticação e banco real, use o
backend Django descrito abaixo.

**CCH Logistics TMS** is a web‑based Transportation Management System (TMS) designed
for a freight brokerage operating in the United States.  It provides
capabilities to register customers and carriers, create and manage
trips/loads, assign equipment, generate rate confirmations and
invoices, record payments, track accounts receivable and payable,
upload documents and run operational and financial reports.

This repository contains a monolithic Django application following a
clean, modular structure.  The system uses Django templates and
Bootstrap 5 for the frontend, PostgreSQL for production storage (with
SQLite used locally), and Python 3.12+.

## Features

* **Authentication and Roles** – Uses Django's built‑in authentication
  system.  Group‑based roles (Admin, Manager, Broker, Dispatcher,
  Accounting, Read Only) can be assigned via the admin interface.
* **Company Profile** – Stores remit‑to and branding information for
  invoices and rate confirmations.
* **Customer Management** – Manage shippers/consignees with full
  billing and physical address information, contact persons, payment
  terms, credit limits and notes.
* **Carrier Management** – Manage motor carriers with regulatory
  identifiers (MC/DOT), dispatch and accounting contacts, insurance
  details, payment terms and compliance documents.
* **Trips / Loads** – Create trips with automatic trip number
  generation, assign customers and carriers, set equipment, dates,
  rates and track status.  Gross margin and margin percentage are
  calculated automatically.
* **Stops and Locations** – Define reusable facilities (locations)
  and attach multiple pickup and delivery stops to a trip in order.
* **Basic UI** – Clean Bootstrap‑based tables and forms with
  pagination and search capabilities.

Future phases will add rate confirmations, invoices, payments, audit
logs, document management and reports.

## Local Setup

1. **Clone the repository** (this project sits in the `cchlogistics_tms`
   directory of the shared workspace used by ChatGPT).  If you are
   working locally, clone it from your private GitHub repository.
2. **Create a virtual environment** and activate it:

   ```bash
   python3 -m venv env
   source env/bin/activate
   ```

3. **Install dependencies** from the lockstep requirements file:

   ```bash
   pip install -r requirements.txt
   ```

4. **Copy the environment template** and adjust variables as needed:

   ```bash
   cp .env.example .env
   # edit .env to set SECRET_KEY, DEBUG, database and email settings
   ```

5. **Run database migrations** to create the schema:

   ```bash
   python manage.py migrate
   ```

6. **Create a superuser** to access the admin interface:

   ```bash
   python manage.py createsuperuser
   ```

7. **Run the development server**:

   ```bash
   python manage.py runserver
   ```

   Visit `http://localhost:8000` in your browser.  Login via the
   `/accounts/login/` page using the superuser credentials.

## Environment Variables

The project reads configuration from environment variables.  See
`.env.example` for a complete list.  Important settings include:

* `SECRET_KEY` – A unique secret for your project (required in
  production).
* `DEBUG` – Set to `False` in production to disable debug mode.
* `ALLOWED_HOSTS` – Comma‑separated list of domain names permitted to
  serve the application when `DEBUG=False`.
* `TIME_ZONE` – IANA timezone (default `America/Denver`).
* `POSTGRES_*` – PostgreSQL connection details for production.
* `CSRF_TRUSTED_ORIGINS` – Comma‑separated list of trusted origins
  used by Django's CSRF protection.
* Email settings – Optional variables for future email support.

## Database Setup

SQLite is used by default for local development.  For production,
configure a PostgreSQL database and set the `POSTGRES_*` environment
variables.  After configuring the variables run `python manage.py
migrate` against the production database to create the schema.

## Running Tests

Tests will be added in future phases.  Once implemented, run them with:

```bash
python manage.py test
```

## Seed Demo Data

A management command to generate demo data will be provided in a later
phase.  The command will create customers, carriers, trips and
payments to explore the system.  It will be invoked as:

```bash
python manage.py seed_demo_data
```

## Deployment to Render or Railway

> **Important:** GitHub Pages only hosts static sites and cannot run Django.
> Use Render/Railway/Fly.io/Heroku for the live web app and keep GitHub Pages
> only for repository documentation.

1. **Configure environment variables** in your Render or Railway
   dashboard.  Use the same values you would place in `.env` for
   production (set `DEBUG=False`).
2. **Provision a PostgreSQL database** and configure the `DATABASE_URL`
   or `POSTGRES_*` variables.
3. **Run migrations** as part of your release workflow:

   ```bash
   python manage.py migrate
   ```

4. **Collect static files** when deploying to production:

   ```bash
   python manage.py collectstatic --noinput
   ```

5. **Create an administrative user** on the production server using
   `createsuperuser`.

Refer to the Render/Railway documentation for service‑specific setup
instructions.  Ensure that `ALLOWED_HOSTS` includes your custom
domain and that `CSRF_TRUSTED_ORIGINS` is set appropriately.

## Basic User Workflow

Once logged in, a user with the **Broker** role can:

1. Navigate to **Customers** to add a new customer with billing and
   physical addresses, contacts and payment terms.
2. Navigate to **Carriers** to add a new carrier with regulatory
   identifiers, dispatch/accounting contacts, payment terms and
   compliance documents.
3. Navigate to **Trips** to create a new trip.  Assign a customer and
   carrier, select equipment, enter pickup and delivery dates and
   rates.  The system automatically generates a trip number.
4. After saving, review the trip detail page.  (In a later phase you
   will be able to add pickup and delivery stops, generate a rate
   confirmation, create an invoice, record payments and upload
   documents.)

Accounting users will later record payments against invoices, mark
invoices as paid and generate financial reports.  Admin users can
manage user roles and view audit logs.
