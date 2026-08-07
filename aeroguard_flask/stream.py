"""Simulated GDS event stream.

A background scheduler (APScheduler) wakes every 45-90 seconds and
injects a fake event into a random tenant's data — a caught ADM risk
or a pulsing alert. The dashboard polls ``/provider/live-feed.json``
for these and surfaces them in the "Live Activity" card.

The point is **the demo never feels frozen**. Walk away for two
minutes, come back, and counters have moved on their own.

Production note: APScheduler runs in-process and is **per-worker**.
With multiple gunicorn workers each one would run its own scheduler
and emit duplicate events. For the MVP we pin gunicorn to 1 worker
and accept that. Section 12 will migrate to a separate beat process
(or a Redis-backed scheduler) when we need horizontal scaling.
"""
from __future__ import annotations

import logging
import os
import random
import secrets
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pools of fake but plausible PNR / passenger / route material
# ---------------------------------------------------------------------------

PAX_NAMES = [
    "MOYO/TENDAI", "NCUBE/THANDIWE", "DEMHE/PATRICK", "OWUSU/KWAME",
    "YUSUF/AMINA", "JABULANI/SIPHO", "VAN DER MERWE/J", "OKONKWO/CHIKE",
    "MWANGI/ESTHER", "RUBADIRI/F MRS", "MUSONDA/JOSEPH", "ABDI/HASSAN",
]
PNR_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
ROUTES = [
    "JNB-DOH", "NBO-DXB", "ADD-IST", "ACC-LHR", "LOS-CDG",
    "HRE-JNB", "CPT-DOH", "KGL-CMN", "LUN-DXB", "DAR-IST",
]
AIRLINES = ["QR", "EK", "ET", "KQ", "MS", "TK", "SN", "AT"]
ADM_REASONS = [
    ("FXR-103", "Fare basis mismatch", 320, 1600),
    ("TKT-204", "Ticketing time limit expired", 200, 800),
    ("NCP-011", "Name change post-ticketing", 150, 320),
    ("DUP-021", "Duplicate booking", 400, 900),
    ("TAX-401", "Tax recalculation required", 90, 380),
    ("SSR-072", "DOCS SSR rejected", 0, 0),   # zero-cost catch
]
def _rand_pnr() -> str:
    return "".join(random.choices(PNR_ALPHABET, k=6))


def _rand_ticket() -> str:
    return f"{random.randint(100, 999)}-{random.randint(1000000000, 9999999999)}"


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

def _event_adm_caught(db, models, agency):
    """Bump month_adms on a random agency + write a pending issue + audit."""
    code, label, low, high = random.choice(ADM_REASONS)
    agency.month_adms = (agency.month_adms or 0) + 1
    agency.updated_at = datetime.utcnow()

    # PendingIssue catalog entry — visible on dashboard "Pending Issues" tile.
    # 6 hex chars → ~16M ids; collisions are effectively impossible for a demo,
    # but if one ever landed the outer try/except would roll back cleanly.
    pid = f"P-S{secrets.token_hex(3).upper()}"
    db.session.add(models.PendingIssue(
        id=pid,
        agency=agency.name,
        type="ADM Risk",
        summary=f"{code} — {label} (PNR {_rand_pnr()}, est ${random.randint(low, max(high, low + 1))})",
        age="just now",
        priority="HIGH" if high >= 800 else "MED",
    ))

    db.session.add(models.AuditLog(
        provider_id=agency.provider_id,
        actor_user_id=None,
        action="STREAM_ADM_CAUGHT",
        target_type="agency",
        target_id=agency.id,
        note=f"{code}:{agency.name}",
    ))
    return f"ADM caught at {agency.name}: {code}"


def _event_alert_refresh(db, models, agency):
    """Touch an existing alert's time so the dashboard alerts feed pulses."""
    alerts = models.Alert.query.all()
    if not alerts:
        return None
    a = random.choice(alerts)
    a.time = datetime.utcnow().strftime("%H:%M")
    db.session.add(models.AuditLog(
        provider_id=agency.provider_id,
        actor_user_id=None,
        action="STREAM_ALERT_TICK",
        target_type="alert",
        target_id=a.id,
        note=a.title,
    ))
    return f"Alert refreshed: {a.title}"


EVENTS = [
    (_event_adm_caught, 5),
    (_event_alert_refresh, 2),
]


def _pick_event():
    population, weights = zip(*EVENTS)
    return random.choices(population, weights=weights, k=1)[0]


# ---------------------------------------------------------------------------
# Tick
# ---------------------------------------------------------------------------

def run_one_tick(app) -> str | None:
    """Run one event inside the app context. Returns a human description.

    Safe to call manually (e.g. from the admin "Inject demo event" button)
    or from the scheduler. Catches and logs any error so the scheduler
    thread keeps running.
    """
    import models  # local import — avoid circular at module import time

    with app.app_context():
        try:
            agencies = (
                models.Agency.query
                .filter(models.Agency.status.in_(("ACTIVE", "TRIAL")))
                .filter(models.Agency.deleted_at.is_(None))
                .all()
            )
            if not agencies:
                return None
            agency = random.choice(agencies)
            event_fn = _pick_event()
            description = event_fn(models.db, models, agency)
            models.db.session.commit()
            logger.info("stream tick → %s", description)
            return description
        except Exception:
            logger.exception("stream tick failed")
            models.db.session.rollback()
            return None


# ---------------------------------------------------------------------------
# Scheduler lifecycle
# ---------------------------------------------------------------------------

_scheduler: BackgroundScheduler | None = None


def start_event_stream(app) -> BackgroundScheduler | None:
    """Boot the background scheduler if it isn't already running.

    Disabled when AEROGUARD_STREAM=0 (useful for tests). Guarded so it
    only starts once per process even if Flask's reloader re-imports.
    """
    global _scheduler
    if os.environ.get("AEROGUARD_STREAM", "1") != "1":
        logger.info("stream disabled via AEROGUARD_STREAM=0")
        return None
    if _scheduler is not None and _scheduler.running:
        return _scheduler

    min_s = int(os.environ.get("AEROGUARD_STREAM_MIN_S", 45))
    max_s = int(os.environ.get("AEROGUARD_STREAM_MAX_S", 90))

    sched = BackgroundScheduler(daemon=True, timezone="UTC")
    # Schedule the first tick soon, then re-schedule each run to a fresh
    # random interval inside [min_s, max_s].
    def _tick_and_reschedule():
        run_one_tick(app)
        sched.add_job(
            _tick_and_reschedule,
            "date",
            run_date=datetime.utcnow() + timedelta(seconds=random.randint(min_s, max_s)),
            id="stream_tick",
            replace_existing=True,
        )
    sched.add_job(
        _tick_and_reschedule,
        "date",
        run_date=datetime.utcnow() + timedelta(seconds=10),  # first tick after 10s
        id="stream_tick",
    )
    sched.start()
    _scheduler = sched
    logger.info("stream started (every %ds-%ds, first in 10s)", min_s, max_s)
    return sched


def shutdown_event_stream():
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        _scheduler = None
