"""SQLite data layer for the AERO-GUARD prototype."""
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
import random

import bcrypt

DB_PATH = Path(__file__).resolve().parent.parent / "aero_guard.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS agencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    pcc TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('provider','manager','helpdesk','consultant')),
    full_name TEXT NOT NULL,
    agency_id INTEGER REFERENCES agencies(id)
);

CREATE TABLE IF NOT EXISTS violations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agency_id INTEGER NOT NULL REFERENCES agencies(id),
    consultant TEXT NOT NULL,
    pnr TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('low','medium','high','critical')),
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','acknowledged','resolved')),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS adm_audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agency_id INTEGER NOT NULL REFERENCES agencies(id),
    consultant TEXT NOT NULL,
    pnr TEXT NOT NULL,
    reason TEXT NOT NULL,
    amount REAL NOT NULL,
    liable_party TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received','disputed','waived','potential')),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agency_id INTEGER NOT NULL REFERENCES agencies(id),
    client_name TEXT NOT NULL,
    pnr TEXT NOT NULL,
    reason TEXT NOT NULL,
    amount REAL NOT NULL,
    issued_by TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS helpdesk_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agency_id INTEGER NOT NULL REFERENCES agencies(id),
    sender TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


def get_conn():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def init_db(seed: bool = True):
    conn = get_conn()
    conn.executescript(SCHEMA)
    conn.commit()
    if seed:
        conn.execute("BEGIN IMMEDIATE")
        try:
            count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            if count == 0:
                _seed(conn)
            conn.commit()
        except (sqlite3.OperationalError, sqlite3.IntegrityError):
            conn.rollback()
    conn.close()


def _seed(conn):
    now = datetime.utcnow()

    agencies = [
        ("Skyline Travel", "PCC001"),
        ("Horizon Voyages", "PCC002"),
        ("Continental Tours", "PCC003"),
    ]
    for name, pcc in agencies:
        conn.execute(
            "INSERT INTO agencies (name, pcc, status, created_at) VALUES (?,?,?,?)",
            (name, pcc, "active", now.isoformat()),
        )
    agency_ids = [row["id"] for row in conn.execute("SELECT id FROM agencies")]

    users = [
        ("provider", "provider123", "provider", "Aero Guard HQ", None),
        ("manager1", "manager123", "manager", "Jane Mwangi", agency_ids[0]),
        ("helpdesk1", "help123", "helpdesk", "Sam Otieno", None),
        ("consultant1", "consultant123", "consultant", "Lucy Wanjiru", agency_ids[0]),
        ("consultant2", "consultant123", "consultant", "Brian Kiptoo", agency_ids[1]),
    ]
    for username, pwd, role, full_name, agency_id in users:
        conn.execute(
            "INSERT INTO users (username, password_hash, role, full_name, agency_id) VALUES (?,?,?,?,?)",
            (username, hash_password(pwd), role, full_name, agency_id),
        )

    violation_types = ["Fare expiry", "Schedule change unactioned", "Queue not cleared (HX)", "Ticketing time limit"]
    severities = ["low", "medium", "high", "critical"]
    consultants = ["Lucy Wanjiru", "Brian Kiptoo", "Mary Achieng", "Tom Mutua"]

    for i in range(40):
        conn.execute(
            "INSERT INTO violations (agency_id, consultant, pnr, type, severity, status, created_at) "
            "VALUES (?,?,?,?,?,?,?)",
            (
                random.choice(agency_ids),
                random.choice(consultants),
                f"PNR{1000+i}",
                random.choice(violation_types),
                random.choice(severities),
                random.choice(["open", "acknowledged", "resolved"]),
                (now - timedelta(days=random.randint(0, 29))).isoformat(),
            ),
        )

    reasons = ["Fare rules violation", "Schedule change ADM", "Name correction fee", "No-show ADM"]
    for i in range(30):
        conn.execute(
            "INSERT INTO adm_audits (agency_id, consultant, pnr, reason, amount, liable_party, status, created_at) "
            "VALUES (?,?,?,?,?,?,?,?)",
            (
                random.choice(agency_ids),
                random.choice(consultants),
                f"PNR{2000+i}",
                random.choice(reasons),
                round(random.uniform(50, 600), 2),
                random.choice(["Consultant", "Agency", "Airline", "Client"]),
                random.choice(["received", "disputed", "waived", "potential"]),
                (now - timedelta(days=random.randint(0, 59))).isoformat(),
            ),
        )

    for i in range(8):
        conn.execute(
            "INSERT INTO vouchers (agency_id, client_name, pnr, reason, amount, issued_by, created_at) "
            "VALUES (?,?,?,?,?,?,?)",
            (
                random.choice(agency_ids),
                random.choice(["John Doe", "Amina Yusuf", "Peter Nyongo", "Grace Wambui"]),
                f"PNR{3000+i}",
                random.choice(["Flight cancellation", "Schedule change", "ADM goodwill"]),
                round(random.uniform(20, 300), 2),
                "Aero Guard HQ",
                (now - timedelta(days=random.randint(0, 20))).isoformat(),
            ),
        )

    conn.commit()
