# AERO-GUARD

Active Revenue Sentinel for travel agencies — React/Express rewrite of the original Streamlit prototype.

## Structure

- `client/` — React frontend (Vite). Provider Hub and Consultant Workspace views, currently backed by mock data in `client/src/data/mockData.js`.
- `server/` — Express backend exposing `/api/agencies`, `/api/violations`, `/api/vouchers` over an in-memory dataset seeded from `server/data/seed.js`.

## Running locally

```bash
# Terminal 1 — API
cd server
npm install
npm run dev      # http://localhost:4000

# Terminal 2 — frontend
cd client
npm install
npm run dev       # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:4000` (see `client/vite.config.js`), so the frontend can call the API with relative paths once it's wired up to fetch instead of `mockData.js`.

## Roles

- **Provider** (HQ/helpdesk): Overview, Agencies, Violations, ADM Audits, Vouchers, Support, PCC Emulator.
- **Consultant**: Terminal, Alerts, My Stats, Helpdesk, Passport OCR.

Use the "Switch view" button in the top bar to toggle between the two while there's no login flow yet.
