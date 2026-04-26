# CCH Logistics TMS - Immediate Use Guide

This repository now includes a professional browser-based TMS that can be used immediately through `index.html` or GitHub Pages.

## What works today

- Dashboard with active trips, open A/R, open carrier payables, and gross margin
- Customer management
- Carrier management with MC/DOT, insurance, factoring, dispatch and equipment fields
- Trip/load building with automatic trip numbers
- Multiple pickup and delivery stops per trip
- Customer rate, carrier rate, margin, equipment, commodity and driver/truck details
- Invoice generation from trips
- Printable invoices, using the browser's Print / Save as PDF option
- Printable rate confirmations
- Customer payment recording and automatic invoice balance calculation
- Carrier payables / creditor detail screen
- A/R aging, carrier payable and trip-margin reports
- CSV export by module
- JSON backup and restore
- Demo data loader

## Important limitation

This immediate version stores data in the browser's LocalStorage. That means it is excellent for same-day solo use, demos, training, and validating the workflow, but it is not a true multi-user production database.

Before clearing browser data, switching computers, or using another browser, export a JSON backup from **Settings > Backup JSON**.

## How to run locally

Open `index.html` directly in Chrome or Edge.

## How to publish with GitHub Pages

1. Push this repository to GitHub.
2. Go to repository **Settings > Pages**.
3. Choose deployment from the `main` branch and root folder.
4. Open the GitHub Pages URL.

## Recommended production path

For real multi-user work with login, PostgreSQL, audit trail, document storage, and safer accounting controls, deploy the Django backend and connect it to PostgreSQL. The browser app is the practical bridge so operations can start now without waiting for infrastructure.
