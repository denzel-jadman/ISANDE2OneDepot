# OneDepot Frontend Submission

This folder contains the frontend-only demonstration version of OneDepot. It does not include the Express server, database schema, migrations, server routes, or backend configuration.

The demo runs entirely in the browser and stores its sample data in `localStorage`. Clearing the browser's site data resets the demonstration state.

## Run locally

Requirements: Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the local address printed by Vite.

## Build

```bash
npm run build
```

The production files will be generated in `dist/`.

## Demo accounts

- Owner: `owner@onedepot.com` / `OwnerPassword123`
- Gunsmith: `gunsmith@onedepot.com` / `GunsmithPassword123`

These are browser-only demonstration accounts and are not connected to a production database.
