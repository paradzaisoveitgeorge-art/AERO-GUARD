# AERO-GUARD — Client Updates Checklist

Source: **AERO-GUARD UPDATES.pdf** (32 pages, received 2026-08-24).
Cross-checked against the current Flask app (`aeroguard_flask`) so already-shipped
demo Batches 1–3 are not rebuilt.

**Status legend:** ✅ already in the app (verify only) · 🟡 partially there (extend) · ⬜ new build

---

## A. Agency Provisioning Overhaul — Provider side
*The document specifies this workflow twice (pp. 22, 30–31) — treat as the client's top priority.*

| # | Status | Update | Detail |
|---|--------|--------|--------|
| PH-1 | ✅ 2026-08-24 | Review & Confirm step | Clicking "Provision" first shows a summary screen (agency details, tier, seats, full whitelist table of names/emails) with **[Edit]** and **[Confirm Provisioning]** buttons |
| PH-2 | ✅ 2026-08-24 | Expanded provision form | Add: region, subscription/policy tier (Platinum / Gold / Standard), **manager name + email**, up to **3 consultant names + emails** (whitelist, hard cap enforced) |
| PH-3 | ✅ 2026-08-24 | Email Notification Hub | After Confirm: agency saved as **ACTIVE** and a hub screen shows the pre-generated welcome email (login link, temporary password, system URL, #AG activation steps) with per-user Send |
| PH-4 | ✅ 2026-08-24 | Automated onboarding emails | Wire the hub to `mailer.py` (falls back to on-screen preview when SMTP is not configured, as elsewhere in the app) |

## B. Smart Button (#AG) — Consultant side

| # | Status | Update | Detail |
|---|--------|--------|--------|
| SB-1 | ✅ 2026-08-24 | `#AG` command trigger | Typing `#AG` in the Smartpoint terminal command line opens the panel (command interceptor), in addition to the floating button. Bonus: `ET`/`ER` runs the pre-ticketing scan per TRD §3.1 |
| SB-2 | ✅ 2026-08-24 | **Edit Name & Remarks flow** | Client's explicit p.32 ask: bottom of Add-Pax has "Edit name / remarks". Clickable when the airline allows changes; **greyed out** when the airline forbids them; after ticketing always greyed out **plus** a guidance notice (void ticket & rebook / contact airline — final wording pending from client) |
| SB-3 | ✅ 2026-08-24 | OCR manual-edit fallback | Passport "Verify before push" values become editable so the agent can correct a misread before Apply-to-PNR (corrections flow into the DOCS SSR string) |
| SB-4 | ✅ 2026-08-24 | One-click Auto-Fix | Per-violation **Auto-append** button that injects the exact fix command into the terminal (e.g. `3.APE-…`) — QC warning card clears once appended |
| SB-5 | ✅ 2026-08-24 | Notify Helpdesk (Queue-on-Demand) | Button inside the #AG panel (and violation modal) creates a real escalation ticket with PNR context on the provider queue, without leaving the GDS |
| SB-6 | ✅ 2026-08-24 | Chat deep-link with context | Panel footer live chat pushes the PNR context into the provider support thread; deep-link contract `?pnr=…&agency=…` honoured (full Agency-Portal chat arrives with Batch 3/4) |
| SB-7 | ⬜ | Airline logo per segment | Itinerary maps carrier code → official airline logo on each flight segment row |
| SB-8 | ⬜ | Baggage allowance per segment | Auto-inject the carrier's piece/weight concept (e.g. 2PC) per segment on multi-carrier itineraries |
| SB-9 | ⬜ | Transit-visa warning | Multi-stop itineraries warn when the nationality needs a transit visa (reuses the visa dataset) |
| SB-10 | ⬜ | Trust-badge placement toggle | Agency-level setting: "Verified & Secured by AERO-GUARD" shown prominently or as a subtle footer mark |
| SB-11 | ✅ 2026-08-24 | Tier-contextual violation popup | Violation modal shows penalty **contextualised by policy tier** ("GOLD POLICY · SKYLINK TRAVEL" chip) + numbered step-by-step remediation |
| SB-12 | ✅ 2026-08-24 | Manifest limits | Travellers builder enforces the 9-seated-passenger GDS cap per PNR (infants excluded) with a split-booking prompt |
| SB-13 | ✅ | Offline circuit breaker | Exists (degraded-mode banner); verify it matches spec: 3-second timeout → amber "AERO-GUARD Offline: Manual QC Required", never blocks the agent |

## C. Agency Portal — NEW third tier
*Today the app has Provider + Consultant sides only. This is the largest net-new module: a portal for **Agency Admins**.*

| # | Status | Update | Detail |
|---|--------|--------|--------|
| AP-1 | ✅ 2026-08-25 | Roles + portal shell | `AGENCY_ADMIN` + agency sub-users (max 3); login routes them to the new Agency Portal (`rumbi@skylink.zw` / `tendai@skylink.zw` demo accounts) |
| AP-2 | ✅ 2026-08-25 | Pulse KPI cards | Compliance Rate, ADM Avoided ($), Active Queue, Avg Ticketing Time — with **traffic-light** thresholds (≥90% green · 75–89% amber · <75% red), driven by real ticket data |
| AP-3 | ✅ 2026-08-25 | 30-day compliance chart | SVG area chart: all issuance vs issued-against-warning, 70/30 layout split per spec |
| AP-4 | ✅ 2026-08-25 | My Profile — sub-user CRUD | Add / remove / reset-password / deactivate (instant revoke), hard-capped at 3 — 4th add rejected with flash |
| AP-5 | ✅ 2026-08-25 | Permission matrix | Checkbox matrix per sub-user (reports / visa / chat / escalate); server-enforced — sub-user without `reports` gets 403 on the reports page and Excel export |
| AP-6 | ✅ 2026-08-25 | Issuance reports + Excel export | Tickets by airline / date / route / amount with override + ADM columns; real **.xlsx** named `{Agency}_Issuance_Report_{YYYY-MM-DD}.xlsx` |
| AP-7 | ✅ 2026-08-25 | ADM exposure report | Delivered inside the Reports page: per-ticket OVERRIDE badges with justification tooltips, ADM-incurred KPI + Excel columns |
| AP-8 | ✅ 2026-08-25 | Ignored-alerts audit | Delivered inside the Reports page: "Ignored alerts" KPI + per-row badges, synced to the provider audit trail |
| AP-9 | ✅ 2026-08-25 | ROI / savings dashboard | Delivered inside the Reports page: "ROI — savings realised" KPI + per-ticket SAVED badges |
| AP-10 | ✅ 2026-08-25 | Visa tool + dashboard widget | Quick-access widget on the portal dashboard, sharing one visa dataset with the #AG Smart Button (`visa-rules.js`) |
| AP-11 | ✅ 2026-08-25 | Live chat w/ greeting flow | Greeting form (Agent Name, Agency, PCC, Country) before first chat; standing legal disclaimer + scope limits on the page; binds to the provider support thread with 5s reply polling |
| AP-12 | ✅ 2026-08-25 | Case escalation module | Separate page from chat; ticket with priority (High/Med/Low) + type (General/Financial/Technical), tier-routed, own-cases tracking table |
| AP-13 | ✅ 2026-08-25 | Announcements feed | Portal dashboard feed is DB-backed by the provider broadcast engine (promos, maintenance, industry) |
| AP-14 | ✅ 2026-08-25 | Airline policies & IATA page | Portal section with airline policies (ADM-impact rules), IATA guidelines and the reference-document library |

## D. Provider Helpdesk — intelligence & comms

| # | Status | Update | Detail |
|---|--------|--------|--------|
| PH-5 | ✅ 2026-08-25 | Broadcast engine | Admin posts once on the provider dashboard → broadcasts table → instantly on the provider feed **and** every Agency Portal + email push to agency admins (logged when SMTP off); per-item delete |
| PH-6 | ✅ 2026-08-25 | Multi-tier escalation routing | Escalations carry a category (General→Tier 1, Financial→Tier 2, Technical→Tier 3) shown as queue chips on the provider board; portal filings route by type |
| PH-7 | ⬜ | Agency performance & risk dashboard | Top vs struggling agencies, ADM-by-airline analysis, and a "system-wide vs single-agency" flag on error trends |
| PH-8 | ⬜ | Predictive bypass alerts | Detect a sub-user repeatedly overriding the same warning; alert provider helpdesk + agency admin before an ADM lands |
| PH-9 | ✅ | ADM spike alert | Exists (system-wide spike banner); verify criteria = same airline/route across multiple agencies within 24 h, and drive it from real override data |
| PH-10 | 🟡 | Products section (module replica) | Internal access to agency-facing modules for troubleshooting (partially covered by `/provider/emulate`) |

## E. Cross-cutting / platform

| # | Status | Update | Detail |
|---|--------|--------|--------|
| XC-1 | 🟡 | Legal pages + chat disclaimer | Chat-start disclaimer + standing portal-footer disclaimer done (no refunds via chat, no airline representation); standalone ToS / SaaS / Privacy pages remain for Batch 5 |
| XC-2 | ⬜ | Dark / Light mode toggle | Requested for late-shift agents; app is currently dark-only |
| XC-3 | ⬜ | Public JSON API per spec | `POST /api/v1/compliance/validate` and `POST /api/v1/compliance/escalate` implementing the documented request/response payloads (+ ticket status URL) |
| XC-4 | ✅ 2026-08-25 | Responsive KPI cards | Portal pulse cards stack 4→2→1 columns on smaller screens; chart and 70/30 grid collapse full-width |

---

## Already delivered (from demo Batches 1–3 — no action, verify only)
- Industry News & Alerts feed (provider dashboard) · ADM spike banner · override-reason audit modal
- Visa lookup tab · Passenger builder (ADT/CNN/INF, infant association, name truncation + guarantee)
- Branded itinerary + "Verified & Secured" badge + PDF/WhatsApp/Email share (demo actions)
- Passport OCR simulation (MRZ decode, sanity check) · offline fallback · CSV audit export · policy tier badges
- Provisioning modal (basic) · user invite/reset/MFA · escalations · respond threads · audit log · multi-tenancy

## Explicitly OUT of scope (the client's own subtractions)
- ❌ Automated airline-to-agency chat bridges (triage model instead: "call the airline/GDS")
- ❌ Financial refunds / waiver approvals via chat (formal escalation channel only — enforced by disclaimer)
- ❌ Automated interpretation/negotiation of airline re-issuance rules (flag + protocol only)
- Real GDS SDK integration, real OCR, WebSockets — remain simulated in this Flask prototype

## Waiting on client
- Final wording for the post-ticketing name-change guidance (SB-2): *"…void the ticket and start again / contact airline… will be put when we get the correct information."*

---

## Proposed implementation batches

| Batch | Theme | Items |
|-------|-------|-------|
| **1** | Provisioning overhaul (client's most-repeated ask) | PH-1 → PH-4 |
| **2** | #AG Smart Button refinements | SB-1 → SB-6, SB-11, SB-12 |
| **3** | Agency Portal core (new tier) | AP-1 → AP-6, AP-10, AP-14 |
| **4** | Portal reports & comms | AP-7 → AP-9, AP-11 → AP-13, PH-5, PH-6 |
| **5** | Intelligence, itinerary polish & platform | PH-7, PH-8, SB-7 → SB-10, XC-1 → XC-4 |
