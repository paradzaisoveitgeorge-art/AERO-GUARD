# AERO-GUARD — Persistence & Workflow Polish

This document covers the work added in **Section 6**: turning the
prototype's brittle string timestamps into real datetime fields,
exposing the audit trail to admins, and giving operators a one-click
"reset to demo baseline" before a pitch.

If you've never thought about this before, start with **§1**.

---

## 1. Plain-English overview

Until Section 5, dates and times in the demo were **strings**, not
datetimes. The seed file said `last_active="3 min ago"` literally —
those words. That looked fine when we restarted the server every five
minutes, but the moment data starts surviving across days (which it
now does), those strings rot. A voucher issued yesterday still
says "today" forever. A login from last week still says "now".

Section 6 fixes that.

Three changes:

1. **Real datetimes in the database** for every event that has a time
   ("agency last touched", "voucher issued", "user last logged in",
   "escalation SLA due"). Every mutation stamps them automatically.
2. **One helper** — `humanize(when)` — turns any datetime into the
   prose the UI expects: "just now", "3 min ago", "yesterday",
   "4 days ago", "3 mo ago". Used everywhere we used to hardcode.
3. **One-click "Reset demo data"** on the dashboard, ADMIN-only.
   Wipes every tenant and reseeds the baseline state in <1 second.
   Use it before every pitch so prospects walk into a clean,
   recognisable demo.

Plus: the audit trail (added in Section 5 silently) is now visible
under **Intelligence → Audit Log**. ADMIN can filter by action, by
actor, by time window.

---

## 2. The `humanize()` helper

Lives in `app.py`. Available in every template via the context
processor — call it like any function.

```python
humanize(datetime(2026, 6, 30, 9, 0, 0))
# → "5 hr ago"     (if now is 14:00)

humanize(None)
# → "—"

humanize_sla(due)  # variant for deadlines: "2 hr left" / "overdue 3 hr"
```

Output ladder, in order of precedence:

| Window | Output |
|---|---|
| < 45 s | `just now` |
| < 60 min | `N min ago` |
| < 24 hr | `N hr ago` |
| < 2 days | `yesterday` |
| < 30 days | `N days ago` |
| < 365 days | `N mo ago` |
| ≥ 365 days | `N yr ago` |

For `humanize_sla` the same ladder applies but a past datetime gets
the `overdue` prefix.

---

## 3. New / changed columns

Migration: `888a60e94a0c_section6_updated_at_last_login_at_sla_.py`

| Table | Column | Why |
|---|---|---|
| `users` | `last_login_at` (datetime) | Real timestamp set on every successful login. The legacy `last_login` string is kept in sync but no longer authoritative. |
| `agencies` | `updated_at` (datetime, auto-bumps on UPDATE) | Drives the "Last Active" column. |
| `vouchers` | `updated_at` | Drives "Issued" display via `created_at`. |
| `escalations` | `updated_at` | Bumped on escalate/resolve. |
| `escalations` | `sla_due_at` (datetime) | The real SLA deadline. `sla` string is now computed from it. |
| `threads` | `updated_at` | Bumped on every reply. |

Why both `created_at` and `updated_at`? `created_at` is "when the row
first appeared" (drives "Issued / Opened"). `updated_at` is "last
touched" (drives "Last Active"). They start equal and diverge as the
row gets edited.

SQLAlchemy handles the auto-bumping via `onupdate=datetime.utcnow` on
the column definition — no manual code needed.

---

## 4. Audit log page

`GET /provider/audit-log` — ADMIN only.

Reads the `audit_logs` table (populated since Section 5), scoped to
the current tenant, ordered newest first, capped at 500 rows.

Filters in the form bar:
- **Action contains** — dropdown of distinct actions seen so far
  (`AGENCY_DELETE`, `VOUCHER_ISSUE`, `ESCALATION_ESCALATE`, …)
- **Actor** — dropdown of provider users
- **Window** — last 1, 7, 30, 90 days, or all time

The page is *append-only* by design: there are no edit/delete
controls. That matches how airlines and ICAO auditors expect history
to behave — an action recorded yesterday must still be there next
year, byte-for-byte.

> **Why ADMIN-only?** The audit log can reveal sensitive operational
> intel (who handles which client, which agencies got suspended and
> why). It's not a read-everyone surface. L2/L1 will get a scoped
> view in a future section (e.g. "your own actions only").

---

## 5. Reset demo data

`POST /admin/reset-demo` — ADMIN only, requires CSRF + double
confirmation.

Calls `seed_all()` from `seed.py`, which:
1. Truncates every operational and catalog table
2. Re-creates the 3 providers, 5 users (incl. consultant), 6
   agencies, 2 vouchers, 3 escalations, 2 threads with messages
3. Seeds the standard demo timestamps (matched to the human strings
   the original prototype used — "3 min ago", "yesterday", etc.)

After reseeding, the admin's own user row is regenerated, so we
**log them out** and redirect to `/login`. They sign back in with
the standard demo password. Sub-second on SQLite.

> This is exactly what you'd run before a client demo. The browser
> walks into a known-good state every time.

---

## 6. Why we kept the legacy string columns

The original `last_login`, `last_active`, `issued`, `sla`, `opened`
string columns are still on the models. We didn't drop them because:

1. The original UI was wired to expect plain strings, and Section 6's
   to-dict helpers now overwrite the field with `humanize(real_ts)`
   before the template ever sees it.
2. Dropping a column in a real migration would force two passes
   (rename in code, deploy, drop in DB, deploy) — out of scope for
   the MVP build.

A future tidy-up section will drop them once the field is everywhere
fed from the datetime version.

---

## 7. Smoke test

```bash
# 1. Reset to baseline
flask --app app reset-demo

# 2. Boot
python app.py

# 3. Log in as soviet@aero-guard.io
#    Dashboard should say "Welcome to AERO-GUARD, Soviet · last login just now"
#    ADMs Prevented should show 16 (Skylink 2 + Continental 14) — derived.

# 4. Visit /provider/audit-log — should be empty after a fresh reseed
#    (audit log is wiped along with everything else).

# 5. Provision a new agency → reload audit log → row should appear:
#    AGENCY_PROVISION · agency:AG-XXXX · just now

# 6. Wait 60 seconds, reload audit log → should say "1 min ago"
```

---

## 8. What's next (Section 7 preview)

The big remaining gap is **a feeling of liveness**. Once you've
played with the demo for a few minutes, nothing new happens — the
data the seed wrote is the data you see, full stop.

Section 7 will add a **simulated GDS event stream** — a background
worker (APScheduler) that injects fake PNR violations every 30–60s
into the dashboard counters and the alerts feed. The numbers tick up
in real time, which makes the prototype feel like a product in
production.

After Section 7, the MVP is materially done. Sections 8-12 are
deployment + landing page + pitch package + hardening — the wrapping
around the gift, not the gift itself.
