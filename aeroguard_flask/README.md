# AERO-GUARD — Flask Prototype

A Python/Flask reconstruction of the AERO-GUARD client demo originally built in [Lovable](https://lovable.dev) (React + TanStack Start + Tailwind + shadcn/ui + Supabase). The goal of this version is to reproduce the same pages, layout, and interactive behavior using a plain Flask + Jinja + vanilla CSS/JS stack, so the prototype can be run, hosted, and modified without Node tooling.

The original source the client exported from Lovable is preserved at [`../lovable_source/`](../lovable_source) for reference — every page here was rebuilt by reading that code line by line, not guessed from screenshots.

## What this app is

AERO-GUARD is a compliance/revenue-protection tool for travel agencies that plugs into a GDS (Galileo/Amadeus/Sabre) terminal. It watches PNRs for fare-rule violations that would trigger airline ADMs (Agency Debit Memos), offers one-click fixes, automates passport-to-PNR data entry via MRZ OCR, and gives a travel agency's *provider* (the company selling AERO-GUARD, e.g. a GDS reseller or BSP-style intermediary) a helpdesk console to manage client agencies, vouchers, ADM audits, and escalations.

The prototype has two independent halves, reachable from different URLs, with no login system — anyone hitting the app can use both:

| Route | Audience | What it simulates |
|---|---|---|
| `/` | Travel agency **consultant** | A Travelport Smartpoint terminal window with an AERO-GUARD "smart button" panel that slides in over the command window |
| `/provider/*` | AERO-GUARD **provider/helpdesk staff** | A dark dashboard-style console for managing agencies, users, vouchers, ADM audits, escalations, and more |

You can jump between them with the **"Provider Console →"** link in the Smartpoint menu bar, and **"← Consultant view"** at the bottom of the provider sidebar.

## Running it

Requirements: Python 3.11+, Flask (`pip install flask`).

```bash
cd aeroguard_flask
python app.py
```

This starts the Flask dev server on **http://localhost:5050** (override with `PORT=xxxx python app.py`). Debug mode is on, so editing any template or `app.py` auto-reloads the running server.

There is no database — all data lives in in-memory Python lists/dicts at the top of `app.py` (`AGENCIES`, `HELPDESK_USERS`, `VOUCHERS`, `ESCALATIONS`, etc.). **Restarting the server resets all data** back to the seeded demo values. This is intentional for a prototype: it means every demo starts from a known-good state, but nothing persists across restarts. If this needs to survive restarts, swap the in-memory lists for a SQLite file (see `../aero_guard/backend/db.py` in the original Streamlit prototype for a working pattern already used elsewhere in this project).

### Sharing it publicly

For one-off demos, a Cloudflare quick tunnel works without any account: download `cloudflared`, then

```bash
cloudflared tunnel --url http://localhost:5050
```

This prints a `*.trycloudflare.com` URL that proxies straight to your local server. It only works while your machine and the Flask process are both running, and has no uptime guarantee — fine for a client walkthrough, not for long-term hosting. For something durable, deploy `app.py` to a host like Render, Railway, or PythonAnywhere (any platform that can run a long-lived Python process — this is a vanilla Flask app, no special build step needed).

## Project layout

```
aeroguard_flask/
├── app.py                       # All routes + in-memory mock data
├── static/
│   ├── css/
│   │   ├── style.css            # Design tokens + provider console styling (dark theme)
│   │   └── smartpoint.css       # Smartpoint terminal + AG panel styling (light theme)
│   └── js/
│       └── smartpoint.js        # All client-side state for the "/" page (tabs, OCR flow, violation popup)
└── templates/
    ├── base.html                # Shared shell for every /provider/* page (sidebar + topbar + content slot)
    ├── smartpoint.html          # Standalone page for "/" — does NOT extend base.html
    ├── partials/
    │   ├── sidebar.html         # Provider console left nav
    │   ├── topbar.html          # Provider console top search/notification bar
    │   ├── ag_panel.html        # The AERO-GUARD slide-in panel (5 tabs), included by smartpoint.html
    │   └── violation_modal.html # The "min-stay violation" popup, included by smartpoint.html
    └── provider/
        ├── dashboard.html
        ├── agencies.html
        ├── users.html
        ├── vouchers.html
        ├── audits.html
        ├── escalations.html
        ├── policies.html
        ├── emulate.html
        ├── respond.html
        └── learning.html
```

Two unrelated CSS files exist on purpose: `style.css` is the dark indigo "SaaS dashboard" look used by every `/provider/*` page, and `smartpoint.css` is the light "Windows desktop app" look used only by `/`. They were never meant to share a visual language — that mirrors the original Lovable build, which had two completely different design systems for the two audiences.

## Page-by-page tour

### `/` — Smartpoint Demo (consultant view)

A full-viewport mockup of a Travelport Smartpoint terminal window: title bar, menu bar, toolbar, a left icon rail (with the AERO-GUARD "AG" smart button), a PNR display pane on the left, and a dark command-line pane on the right.

Clicking the **AG button** slides in a 360px panel over the command pane, with 5 tabs:

- **Alerts** (violations) — live stats (saved $, ADMs blocked, compliance score), the current open violation card, a "recent activity" feed, and a "Re-scan PNR" button. About 2.2 seconds after the page loads, a fare-rule violation auto-fires (mirrors the original demo's scripted timing) and opens a popup modal showing the violation detail, the suggested GDS fix command, and **Apply One-Click Fix** / **Ignore** / **Why?** actions. Applying the fix updates the running savings/ADMs-blocked counters and writes lines into the command-line terminal.
- **Passport** — drag-and-drop / paste / file-picker passport image upload that runs through a 4-step OCR state machine: `idle → scanning → verify → applied`. The "scanning" step is a 900ms simulated delay (matches the original's `setTimeout`), after which a mock MRZ-decoded passport record appears in an editable verification table with the MRZ string rendered underneath. **Apply to PNR** pushes a `DOCS SSR` line into the terminal and marks the record pushed.
- **Vouchers** — 3 seeded vouchers (Platinum/Gold/Silver tiers) with Attach-to-PNR and Details actions.
- **Learn** — 3 tutorial cards (title/blurb/duration/tag). Video files aren't included since the original Lovable export didn't ship the actual `.mp4` assets, only URLs to Lovable-hosted files — these render as a placeholder play icon instead.
- **Help** — a free-text "Ask AERO-GUARD" input and 4 canned FAQ buttons.

Everything on this page is **pure client-side JavaScript** (`static/js/smartpoint.js`) — no server round-trips, since the original behavior is all live/animated UI state (timers, typewriter-style terminal lines, popups) that would feel wrong with a page reload per action.

### `/provider/*` — Provider Console (helpdesk view)

A conventional multi-page dashboard, server-rendered with real form submissions (the opposite approach from `/`, since these are CRUD-style admin screens where page reloads are normal and expected):

- **Dashboard** (`/provider`) — welcome hero, 4 top-line stats, 3 "compliance content" cards, a service alerts feed, a pending-issues list, quick-action shortcuts, and a profile/learning/socials row.
- **Agencies** (`/provider/agencies`) — sortable/filterable agency table (by GDS, country, policy tier), bulk select + Suspend/Reactivate/Delete, a full-screen "Provision New Agency" form whose policy-module checklist changes based on the selected GDS (1G/1A/1S).
- **Helpdesk Users** (`/provider/agencies` → `/provider/users`) — operator account table with MFA/status indicators and an "Add User" form that warns if the email isn't on the `@aero-guard.io` domain.
- **Vouchers** (`/provider/vouchers`) — an issue-voucher form (with a PNR "Verify" button) next to a searchable, exportable (CSV) table of recently issued vouchers.
- **ADM Audits** (`/provider/audits`) — DAY/WEEK/MONTH range toggle, agency filter, top-line stats, a reason-distribution bar chart, and a per-agency breakdown table with a health-sort toggle and a drill-down modal showing the top triggering compliance rules for a given agency.
- **Escalations** (`/provider/escalations`) — a list of open support escalations with SLA countdowns, "Escalate to L2"/"Escalate to Vendor" actions (each opens a confirm-and-log modal), and a "Resolve" action.
- **Policies** (`/provider/policies`) — a static grid of GDS/NDC/OTA/AERO-GUARD policy documents.
- **Emulate into PCC** (`/provider/emulate`) — an audited terminal-emulation simulator: you must type an audit reason before "Connect" is allowed, after which a fake terminal session opens and accepts a couple of recognized command prefixes (`*R`, `FXX`).
- **Respond to Clients** (`/provider/respond`) — a two-thread support chat inbox with a reply form and a "Response tools" sidebar (quick audit, send demo video, call back, email transcript, links to Emulate/Escalate).
- **My Learning** (`/provider/learning`) — 4 certification modules with progress bars.

All of the `/provider/*` data lives in plain Python lists at the top of `app.py`. Mutating actions (provisioning an agency, issuing a voucher, escalating a case, etc.) are real `POST` routes that mutate those lists in place and redirect back — refresh-safe, but reset on server restart.

## Known gaps vs. the original Lovable app

- **No authentication.** The original used Supabase Auth + role-based RLS (`consultant` vs `helpdesk_admin`). This prototype has no login wall on either `/` or `/provider/*` — anyone with the URL can do anything.
- **No real database.** Original used Supabase Postgres; this uses in-memory Python data that resets on restart.
- **No real GDS integration.** Both the Smartpoint terminal and the "Emulate into PCC" panel are visual simulations only — there's no Travelport TSAPI bridge, same as the original (the original's `plan.md` explicitly calls this out as "out of scope").
- **No OCR engine.** The Passport tab simulates the *flow* (timing, UI states) but doesn't actually run Tesseract/Textract against an uploaded image — it always returns the same mock passport record regardless of what file you drop in.
- **No tutorial videos.** Referenced by the original via Lovable-hosted asset URLs that weren't included in the code export.

## Where to make changes

- **Add/edit mock data** → top of `app.py` (e.g. `AGENCIES`, `VOUCHERS`, `ESCALATIONS`).
- **Add a new provider page** → create a template in `templates/provider/`, add a route in `app.py` using the `render_provider(template, active_nav_key, **context)` helper (it auto-injects the sidebar/topbar), and add an entry to `NAV_GROUPS` in `app.py` if it should appear in the sidebar.
- **Change the Smartpoint panel** → `templates/partials/ag_panel.html` for markup, `static/js/smartpoint.js` for behavior, `static/css/smartpoint.css` for styling.
- **Change provider console look & feel** → `static/css/style.css` holds every CSS variable and component class shared across `/provider/*`.

See [`../BUILD_PLAN.md`](../BUILD_PLAN.md) for the original page-by-page build order this prototype followed.
