# AERO-GUARD — Liveness & Event Stream Guide

This document covers the simulated GDS event stream added in
**Section 7**. The goal of this section was simple: **the demo
should never feel frozen**. Up to Section 6 the data was real and
persistent, but it only changed when you clicked. Now numbers tick
up on their own — exactly like a live production console would.

If you've never touched background schedulers before, start with
**§1**.

---

## 1. Plain-English overview

Open the AERO-GUARD dashboard. Don't touch anything. Wait sixty
seconds. The "ADMs Prevented" counter goes up. The "Live Activity"
card slides a new row in at the top with a small fade animation. The
service-alerts timestamps refresh. The dashboard is *breathing*.

This is not real GDS data — it's a small simulator that runs inside
the same Python process as the web server. Every 45–90 seconds it:

1. Picks a random active agency from any tenant
2. Picks an event type (ADM caught, voucher issued, alert refresh)
3. Writes that event to the database + audit log

The dashboard polls for those audit-log entries every 10 seconds and
prepends them to the **Live Activity** card. The pulsing green LIVE
chip in the corner tells the viewer this isn't a screenshot.

If you're mid-pitch and want a specific moment to feel live on cue,
admins also see an **⚡ Inject demo event** button — one click fires
a tick immediately.

---

## 2. Event types

Defined in `stream.py` as `EVENTS` (a weighted list).

| Event | Weight | What it writes |
|---|---|---|
| `STREAM_ADM_CAUGHT` | 5 | Bumps `agency.month_adms`, appends a new `PendingIssue` row, writes audit log. Drives the "ADMs Prevented" counter and "Pending Issues" tile. |
| `STREAM_VOUCHER_ISSUED` | 3 | Creates a `Voucher` for a random PAX. Visible on the Vouchers page. |
| `STREAM_ALERT_TICK` | 2 | Touches an existing `Alert` row's time so the service-alerts feed pulses. |

To add a new event: write a function `_event_x(db, models, agency)`
in `stream.py`, append it to `EVENTS` with a weight, done.

ADM codes / passenger names / routes / airlines are drawn from pools
at the top of `stream.py` — easy to expand if a pitch needs more
variety.

---

## 3. Scheduler lifecycle

We use `APScheduler` with a `BackgroundScheduler`. It runs in a
daemon thread inside the same process as Flask.

### Boot
`_maybe_start_stream()` at the bottom of `app.py` decides whether to
start it. Two guards apply:

1. **Don't start during CLI commands**
   (`flask seed`, `flask reset-demo`). Detected via
   `FLASK_RUN_FROM_CLI=true` — set automatically by Flask's CLI.
2. **In dev mode, only start in the reloader's child process.**
   Flask's dev server forks: a parent watches files, a child runs
   the app. Without this guard the scheduler would start in both
   and emit duplicates. Detected via `WERKZEUG_RUN_MAIN=true`.

### Cadence
Each tick fires `run_one_tick(app)`, then re-schedules the next one
to fire after a fresh random delay in `[AEROGUARD_STREAM_MIN_S,
AEROGUARD_STREAM_MAX_S]` (defaults: 45–90 seconds). This produces
jitter — back-to-back events look believable instead of metronomic.

### Kill switch
Set `AEROGUARD_STREAM=0` to disable entirely. The app still serves
requests normally; the dashboard's Live Activity card just stays
empty.

---

## 4. The dashboard widget

Lives in `templates/provider/dashboard.html`. Three moving parts:

1. The **LIVE chip** — a CSS-only pulsing green dot. Pure animation,
   nothing functional.
2. The **`<ul id="live-feed">`** that the JS populates.
3. A small inline IIFE that polls `/provider/live-feed.json` every
   10 seconds:
   - Tracks seen event IDs in a `Set` so duplicates don't double-render.
   - Prepends new items with a CSS fade-in.
   - Caps the visible list at 8 (older items drop off the bottom).

The endpoint is tenant-scoped — Soviet only sees events for AERO-GUARD
HQ, Kelvin only sees SkyOps events. Cross-tenant invisibility is
inherited from Section 5's `tenant_q()` helper.

---

## 5. Production constraints

Read these before pushing to Render.

### Single-worker requirement
`APScheduler.BackgroundScheduler` runs **in-process**. With multiple
gunicorn workers each one starts its own scheduler and emits
duplicate events. For the MVP:

- The `Procfile` pins `--workers 2`. **Change to `--workers 1`**
  *or* extract the scheduler into a separate "beat" process before
  bumping worker count.
- Alternative path: use `APScheduler`'s
  `SQLAlchemyJobStore` so all workers share a job table and only
  one picks up each tick. We'll do that in Section 12 (hardening).

### Memory + time accuracy
The in-process scheduler uses the same Python interpreter, so a
long-running request can delay a tick. Demo-level acceptable; for
production swap to a separate worker.

### Restart resets the stream cadence
If you restart the server the next tick fires 10 seconds after boot.
Audit-log entries from the previous run are preserved (they're in
the DB), so the Live Activity card immediately repopulates with
history — the demo never looks empty after a restart.

---

## 6. Knobs (env vars)

| Var | Default | What it does |
|---|---|---|
| `AEROGUARD_STREAM` | `1` | Set to `0` to disable the scheduler entirely. |
| `AEROGUARD_STREAM_MIN_S` | `45` | Minimum seconds between ticks. |
| `AEROGUARD_STREAM_MAX_S` | `90` | Maximum seconds between ticks. |

For a pitch demo with high activity, try `MIN=15`, `MAX=30` — events
land every 20-ish seconds, the dashboard feels electric. Don't keep
this in production: ADM counters would inflate unrealistically over
days.

---

## 7. Smoke test

```bash
# Boot the app, sign in as soviet@aero-guard.io, navigate to /provider.
# Within 10-15 seconds (10s first tick + 10s first poll) the
# Live Activity card should populate with at least one event.

# Force one immediately as ADMIN:
#   Click "⚡ Inject demo event" — feed updates on next 10s poll.

# Disable + restart to confirm the kill switch:
AEROGUARD_STREAM=0 python app.py
# Live Activity stays empty; no audit-log rows accrue.

# Speed it up for a 2-minute pitch slot:
AEROGUARD_STREAM_MIN_S=10 AEROGUARD_STREAM_MAX_S=20 python app.py
```

---

## 8. What's next

Section 7 was the last "missing demo magic" item. The MVP is now
**materially feature-complete**. Sections 8 onward are the wrapping:

- **Section 8**: real reports + CSV exports beyond vouchers (ADM
  savings, escalation SLA stats)
- **Section 9**: deploy to Render, custom domain, HTTPS
- **Section 10**: landing page at `/`, /about, /privacy
- **Section 11**: backups, error tracking (Sentry), uptime monitor
- **Section 12**: hardening — CSP, HSTS, separate scheduler worker,
  Redis-backed rate limit + APScheduler job store

You can stop here and pitch the MVP as it stands — every prospect
walking into the demo will see a console that reads numbers, gates
permissions, isolates tenants, and updates itself in real time.
That's enough story for a first conversation with any travel agency
or even a small airline pilot.
