# Invoice Pocket

Invoice Pocket is a mobile-friendly, installable invoice web app for independent
workers and small businesses. It works offline after the first visit and keeps
invoice data private in the browser's local storage.

## Features

- Customer name, phone number, and address
- Invoice date and automatically generated invoice number
- Work description, hours, hourly rate, and automatic labor subtotal
- Multiple materials and extra-charge lines
- Pending, paid, and overdue payment statuses
- Notes and automatic total calculation
- Local save, edit, search, filter, and delete
- Native share sheet with clipboard fallback
- Print-ready layout for paper or Save as PDF
- Installable PWA with manifest, service worker, and maskable icons
- Responsive phone, tablet, desktop, and print layouts

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production build

```bash
npm run build
npm run start
```

## Install the app

In a supported browser, open the site and choose **Install** from the browser or
the app's install button when it appears. On iPhone or iPad, use Safari's Share
menu and choose **Add to Home Screen**.

## Storage and privacy

Invoices are stored only in `localStorage` on the current browser profile. There
is no account, cloud database, tracking, or server-side invoice storage. Clearing
site data removes saved invoices, so print or save important invoices as PDFs for
backup.

## Offline behavior

The service worker caches the application shell and same-origin assets after the
first successful visit. Saved invoice records remain available offline because
they live in local storage. Sharing options depend on the device and may require
connectivity for the chosen share destination.
