"""
Django settings for the CCH Logistics TMS project.

This configuration file defines how Django behaves in both development
and production environments.  It relies heavily on environment
variables so that secrets and deployment‑specific values are not
committed to source control.  Default values are provided for local
development.

Key environment variables:
    SECRET_KEY: cryptographic secret, required in production
    DEBUG: set to 'False' in production
    ALLOWED_HOSTS: comma‑separated list of hosts in production
    TIME_ZONE: IANA timezone string (defaults to 'America/Denver')
    POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT:
        PostgreSQL connection details for production
    CSRF_TRUSTED_ORIGINS: comma‑separated list of trusted origins for CSRF
    APP_DOMAIN: optional production URL used to enforce host/CSRF settings
"""

from pathlib import Path
from urllib.parse import urlparse
import os


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


def _csv_env(var_name: str) -> list[str]:
    raw_value = os.environ.get(var_name, "")
    return [item.strip() for item in raw_value.split(",") if item.strip()]


def _resolve_domain() -> str:
    """Resolve production domain from APP_DOMAIN or Render-provided variables."""
    return (
        os.environ.get("APP_DOMAIN", "").strip()
        or os.environ.get("RENDER_EXTERNAL_URL", "").strip()
        or os.environ.get("RENDER_EXTERNAL_HOSTNAME", "").strip()
    )


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get("SECRET_KEY", "unsafe‑development‑secret")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get("DEBUG", "True").lower() not in {"false", "0", "no"}

# Allow all hosts in development. In production, require explicit hosts.
ALLOWED_HOSTS: list[str] = []
if not DEBUG:
    ALLOWED_HOSTS = _csv_env("ALLOWED_HOSTS")

# Application definition

INSTALLED_APPS: list[str] = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Project apps
    "core",
    "accounts",
    "customers",
    "carriers",
    "trips",
    "stops",
    "rate_confirmations",
    "invoices",
    "payments",
    "reports",
    "audit",
    # Placeholder for future apps:
    # "rate_confirmations",
    # "invoices",
    # "payments",
    # "carrier_payments",
    # "documents",
    # "reports",
    # "audit",
]

MIDDLEWARE: list[str] = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "cchlogistics_tms.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "cchlogistics_tms.wsgi.application"


# Database configuration
#
# The application uses SQLite for local development.  In production, PostgreSQL
# credentials should be supplied via environment variables.  Additional
# database engines can be configured by altering this section as needed.
if DEBUG:
    DATABASES: dict[str, dict[str, object]] = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("POSTGRES_DB", "cchlogistics"),
            "USER": os.environ.get("POSTGRES_USER", ""),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD", ""),
            "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
            "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        }
    }

# Password validation
# https://docs.djangoproject.com/en/stable/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS: list[dict[str, str]] = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 12},
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
# https://docs.djangoproject.com/en/stable/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = os.environ.get("TIME_ZONE", "America/Denver")

USE_I18N = True

USE_TZ = True


# Static and media files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/stable/howto/static-files/

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Default primary key field type
# https://docs.djangoproject.com/en/stable/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CSRF trusted origins (comma separated list)
CSRF_TRUSTED_ORIGINS: list[str] = _csv_env("CSRF_TRUSTED_ORIGINS")

# Enforce final production domain in ALLOWED_HOSTS and CSRF_TRUSTED_ORIGINS.
production_domain = _resolve_domain()
if production_domain:
    parsed_domain = urlparse(production_domain if "://" in production_domain else f"https://{production_domain}")
    domain_host = parsed_domain.netloc or parsed_domain.path
    domain_origin = f"{parsed_domain.scheme or 'https'}://{domain_host}"

    if domain_host and domain_host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(domain_host)
    if domain_origin and domain_origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(domain_origin)

if not DEBUG:
    if not ALLOWED_HOSTS:
        raise RuntimeError("ALLOWED_HOSTS must be configured when DEBUG=False.")
    if not CSRF_TRUSTED_ORIGINS:
        raise RuntimeError("CSRF_TRUSTED_ORIGINS must be configured when DEBUG=False.")

# Login configuration
LOGIN_REDIRECT_URL = "/"
LOGOUT_REDIRECT_URL = "/accounts/login/"
