"""Seed + reset routines for the AERO-GUARD MVP.

These functions create a known-good demo state: 3 provider companies,
1 consultant, and realistic agencies / escalations spread across them.
Used by the ``flask seed`` and ``flask reset-demo`` CLI commands
(registered in app.py).
"""
from __future__ import annotations

from datetime import datetime, timedelta

from models import (
    db,
    Provider,
    User,
    Agency,
    Escalation,
    Thread,
    Message,
    PolicyDoc,
    LearningModule,
    Alert,
    PendingIssue,
    AuditLog,
)


def _wipe() -> None:
    """Delete every row in every table. Order matters (children first)."""
    Message.query.delete()
    Thread.query.delete()
    Escalation.query.delete()
    AuditLog.query.delete()
    Agency.query.delete()
    User.query.delete()
    Provider.query.delete()
    Alert.query.delete()
    PendingIssue.query.delete()
    PolicyDoc.query.delete()
    LearningModule.query.delete()
    db.session.commit()


def seed_all() -> None:
    """Populate the DB with the standard demo state."""
    _wipe()

    now = datetime.utcnow()
    def ago(**kw):
        return now - timedelta(**kw)

    # --- Providers ---------------------------------------------------------
    aeroguard = Provider(id="PRV-AG", name="AERO-GUARD HQ", slug="aero-guard", country="ZW")
    skyops = Provider(id="PRV-SKY", name="SkyOps Africa", slug="skyops", country="ZA")
    horizon = Provider(id="PRV-HZ", name="Horizon GDS Partners", slug="horizon", country="KE")
    db.session.add_all([aeroguard, skyops, horizon])

    # --- Users (helpdesk staff + consultant) ------------------------------
    # All seeded accounts use the same demo password: "aeroguard"
    DEMO_PASSWORD = "aeroguard"
    users = [
        User(id="U-01", provider_id="PRV-AG",  name="Soviet Moyo",   email="soviet@aero-guard.io",     role="ADMIN",      active=True,  mfa=True,  last_login="now"),
        User(id="U-02", provider_id="PRV-AG",  name="Tariro Ncube",  email="tariro@aero-guard.io",     role="L2",         active=True,  mfa=True,  last_login="2 hr ago"),
        User(id="U-03", provider_id="PRV-SKY", name="Kelvin Owusu",  email="kelvin@skyops.africa",     role="L1",         active=True,  mfa=False, last_login="yesterday"),
        User(id="U-04", provider_id="PRV-HZ",  name="Amina Yusuf",   email="amina@horizon.partners",   role="L1",         active=False, mfa=False, last_login="21 days ago"),
        # The consultant — no provider, role=CONSULTANT
        User(id="U-99", provider_id=None,      name="Patrick Demhe", email="patrick@skylink.zw",       role="CONSULTANT", active=True,  mfa=False, last_login="now"),
    ]
    for u in users:
        u.set_password(DEMO_PASSWORD)
    # Seed realistic last-login timestamps that match the display strings.
    login_offsets = {
        "U-01": now,
        "U-02": ago(hours=2),
        "U-03": ago(days=1),
        "U-04": ago(days=21),
        "U-99": now,
    }
    for u in users:
        u.last_login_at = login_offsets.get(u.id)
    db.session.add_all(users)

    # --- Agencies ---------------------------------------------------------
    # updated_at drives the humanized "last_active" display; we tune each
    # row so the demo looks like an in-flight day of operations.
    agency_specs = [
        ("AG-1001", "PRV-AG",  "Skylink Travel",    "7XQ9", "1G", "ZW", 25, 22, "ACTIVE",       2,  ago(minutes=3),  "STANDARD",   "admin@skylink.zw"),
        ("AG-1002", "PRV-SKY", "Voyage Africa",     "K3P1", "1G", "ZA", 60, 55, "ACTIVE",       7,  ago(minutes=12), "ENTERPRISE", "ops@voyage.co.za"),
        ("AG-1003", "PRV-HZ",  "BlueSky Holidays",  "QM44", "1A", "KE", 15, 9,  "TRIAL",        0,  ago(hours=1),    "BASIC",      "info@bluesky.ke"),
        ("AG-1004", "PRV-AG",  "Continental Tours", "B2H7", "1G", "ZW", 12, 11, "SUSPENDED",    14, ago(days=4),     "STANDARD",   "tt@continental.zw"),
        ("AG-1005", "PRV-SKY", "Equator Travel",    "EQ12", "1A", "UG", 8,  0,  "PROVISIONING", 0,  None,            "BASIC",      "admin@equator.ug"),
        ("AG-1006", "PRV-HZ",  "Mara Routes",       "MR55", "1S", "KE", 20, 4,  "ARCHIVED",     0,  ago(days=90),    "BASIC",      "hello@mara.ke"),
    ]
    agencies = []
    for aid, pid, name, pcc, gds, country, seats, used, status, adms, updated, policy, email in agency_specs:
        a = Agency(id=aid, provider_id=pid, name=name, pcc=pcc, gds=gds, country=country,
                   seats=seats, used_seats=used, status=status, month_adms=adms,
                   policy_level=policy, admin_email=email, last_active="—")
        if updated is not None:
            a.updated_at = updated
            a.created_at = updated
        agencies.append(a)
    db.session.add_all(agencies)

    # --- Escalations ------------------------------------------------------
    esc_specs = [
        # id, prov, agency, pnr, subject, level, priority, status, opened (ago), sla_in
        ("ESC-7781", "PRV-AG",  "Skylink Travel",   "X7K2QP", "PCC emulation failing — auth token expired", "L2",     "HIGH", "PENDING", timedelta(minutes=12), timedelta(minutes=48)),
        ("ESC-7780", "PRV-SKY", "Voyage Africa",    "RR81LM", "ADM dispute QR/2510 — needs evidence pack",   "VENDOR", "HIGH", "OPEN",    timedelta(hours=1),    timedelta(hours=3)),
        ("ESC-7779", "PRV-HZ",  "BlueSky Holidays", "—",      "Onboarding: SSO not redirecting",            "L1",     "MED",  "OPEN",    timedelta(hours=3),    timedelta(hours=21)),
    ]
    escalations = []
    for eid, pid, agency, pnr, subject, level, priority, status, opened_delta, sla_delta in esc_specs:
        e = Escalation(id=eid, provider_id=pid, agency=agency, pnr=pnr, subject=subject,
                       level=level, priority=priority, status=status, opened="", sla="")
        e.created_at = e.updated_at = now - opened_delta
        e.sla_due_at = now + sla_delta
        escalations.append(e)
    db.session.add_all(escalations)

    # --- Threads + Messages ----------------------------------------------
    t91 = Thread(id="T-91", provider_id="PRV-AG",  agency="Skylink Travel", agent="Rumbi",  unread=2, last="Need help on a DOCS SSR reject")
    t90 = Thread(id="T-90", provider_id="PRV-SKY", agency="Voyage Africa",  agent="Tendai", unread=0, last="ADM QR/2510 evidence bundle status?")
    t91.created_at = t91.updated_at = ago(minutes=8)
    t90.created_at = t90.updated_at = ago(minutes=35)
    db.session.add_all([t91, t90])
    db.session.flush()  # ensure thread ids exist before adding messages
    msgs = [
        ("T-91", "AGENT", "DOCS SSR keeps rejecting — passport name has hyphen", ago(minutes=9)),
        ("T-91", "AGENT", "Need help on a DOCS SSR reject",                      ago(minutes=8)),
        ("T-90", "AGENT", "ADM QR/2510 evidence bundle — any status update?",   ago(minutes=40)),
        ("T-90", "OPS",   "Uploaded — please confirm receipt",                  ago(minutes=35)),
    ]
    for tid, sender, text, when in msgs:
        m = Message(thread_id=tid, sender=sender, text=text, t=when.strftime("%H:%M"))
        m.created_at = when
        db.session.add(m)

    # --- Knowledge / catalog ---------------------------------------------
    db.session.add_all([
        PolicyDoc(cat="GDS",         name="Galileo 1G Terms of Use",        v="2025.06"),
        PolicyDoc(cat="GDS",         name="Amadeus 1A Agreement",           v="2025.04"),
        PolicyDoc(cat="NDC",         name="NDC Distribution Agreement",     v="v21"),
        PolicyDoc(cat="OTA",         name="OTA Connectivity Standards",     v="2024.11"),
        PolicyDoc(cat="AERO-GUARD",  name="Acceptable Use Policy",          v="2025.05"),
        PolicyDoc(cat="AERO-GUARD",  name="Data Processing Addendum",       v="2025.02"),
    ])
    db.session.add_all([
        LearningModule(name="NCP Validator Fundamentals", progress=100, badge="✓ Done"),
        LearningModule(name="DOCS SSR Edge Cases",        progress=75,  badge="In progress"),
        LearningModule(name="NDC Order Management",       progress=60,  badge="In progress"),
        LearningModule(name="ADM Dispute Mastery",        progress=0,   badge="Not started"),
    ])
    db.session.add_all([
        Alert(id="A1", severity="CRIT", source="1G GALILEO",  title="Intermittent timeouts on AP-2 host",                       time="14:02", ongoing=True,  impacted_agencies=23),
        Alert(id="A2", severity="WARN", source="QR AIRWAYS",  title="DOH ground stop — IROPS protective rebooking advised",     time="13:41", ongoing=True,  impacted_agencies=8),
        Alert(id="A3", severity="INFO", source="AERO-GUARD",  title="NCP rules v4.12 published (EK, ET, WB)",                   time="11:20", ongoing=False, impacted_agencies=45),
        Alert(id="A4", severity="WARN", source="ET AIRLINES", title="Schedule change wave — 312 PNRs require action",          time="09:15", ongoing=True,  impacted_agencies=14),
    ])
    db.session.add_all([
        PendingIssue(id="P-1", agency="Skylink Travel",    type="DOCS SSR",    summary="Passport hyphen rejected — 3 PAX",       age="8 min", priority="HIGH"),
        PendingIssue(id="P-2", agency="Voyage Africa",     type="ADM Dispute", summary="QR/2510 evidence pack pending",          age="1 hr",  priority="HIGH"),
        PendingIssue(id="P-3", agency="BlueSky Holidays",  type="Onboarding",  summary="SSO redirect failing",                   age="3 hr",  priority="MED"),
        PendingIssue(id="P-4", agency="Continental Tours", type="Fare Rule",   summary="Advance-purchase rule breach — 2 PNRs",  age="5 hr",  priority="MED"),
    ])

    db.session.commit()


def reset_demo() -> None:
    """Wipe and re-seed in one call."""
    seed_all()
