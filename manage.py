#!/usr/bin/env python3
"""
Utility script for running administrative tasks for the CCH Logistics TMS project.

This file follows the standard Django manage.py pattern.  It exposes a
command‑line interface for tasks such as running the development server,
applying migrations, creating superusers and executing custom management
commands.  Django will look for settings in the ``DJANGO_SETTINGS_MODULE``
environment variable; when not provided, it defaults to the local
``cchlogistics_tms.settings`` module.
"""

import os
import sys


def main() -> None:
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cchlogistics_tms.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
