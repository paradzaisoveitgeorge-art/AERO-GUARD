"""Simple role-based auth for the prototype (session-based, not JWT yet)."""
from . import db


def login(username: str, password: str):
    conn = db.get_conn()
    row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    if row is None:
        return None
    if not db.verify_password(password, row["password_hash"]):
        return None
    return dict(row)


def list_users():
    conn = db.get_conn()
    rows = conn.execute("SELECT id, username, role, full_name, agency_id FROM users").fetchall()
    conn.close()
    return [dict(r) for r in rows]
