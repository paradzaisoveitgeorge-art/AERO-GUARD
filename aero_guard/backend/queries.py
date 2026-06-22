"""Data access helpers shared by the Streamlit pages."""
from datetime import datetime
import pandas as pd

from . import db


def _df(query, params=()):
    conn = db.get_conn()
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return pd.DataFrame([dict(r) for r in rows])


def list_agencies():
    return _df("SELECT * FROM agencies ORDER BY name")


def add_agency(name: str, pcc: str):
    conn = db.get_conn()
    conn.execute(
        "INSERT INTO agencies (name, pcc, status, created_at) VALUES (?,?,?,?)",
        (name, pcc, "active", datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()


def set_agency_status(agency_id: int, status: str):
    conn = db.get_conn()
    conn.execute("UPDATE agencies SET status = ? WHERE id = ?", (status, agency_id))
    conn.commit()
    conn.close()


def list_violations(agency_id: int = None):
    if agency_id:
        return _df(
            "SELECT v.*, a.name AS agency_name FROM violations v "
            "JOIN agencies a ON a.id = v.agency_id WHERE v.agency_id = ? "
            "ORDER BY v.created_at DESC",
            (agency_id,),
        )
    return _df(
        "SELECT v.*, a.name AS agency_name FROM violations v "
        "JOIN agencies a ON a.id = v.agency_id ORDER BY v.created_at DESC"
    )


def update_violation_status(violation_id: int, status: str):
    conn = db.get_conn()
    conn.execute("UPDATE violations SET status = ? WHERE id = ?", (status, violation_id))
    conn.commit()
    conn.close()


def list_adm_audits(agency_id: int = None):
    if agency_id:
        return _df(
            "SELECT ad.*, a.name AS agency_name FROM adm_audits ad "
            "JOIN agencies a ON a.id = ad.agency_id WHERE ad.agency_id = ? "
            "ORDER BY ad.created_at DESC",
            (agency_id,),
        )
    return _df(
        "SELECT ad.*, a.name AS agency_name FROM adm_audits ad "
        "JOIN agencies a ON a.id = ad.agency_id ORDER BY ad.created_at DESC"
    )


def list_vouchers(agency_id: int = None):
    if agency_id:
        return _df(
            "SELECT vo.*, a.name AS agency_name FROM vouchers vo "
            "JOIN agencies a ON a.id = vo.agency_id WHERE vo.agency_id = ? "
            "ORDER BY vo.created_at DESC",
            (agency_id,),
        )
    return _df(
        "SELECT vo.*, a.name AS agency_name FROM vouchers vo "
        "JOIN agencies a ON a.id = vo.agency_id ORDER BY vo.created_at DESC"
    )


def issue_voucher(agency_id: int, client_name: str, pnr: str, reason: str, amount: float, issued_by: str):
    conn = db.get_conn()
    conn.execute(
        "INSERT INTO vouchers (agency_id, client_name, pnr, reason, amount, issued_by, created_at) "
        "VALUES (?,?,?,?,?,?,?)",
        (agency_id, client_name, pnr, reason, amount, issued_by, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()


def list_messages(agency_id: int):
    return _df(
        "SELECT * FROM helpdesk_messages WHERE agency_id = ? ORDER BY created_at",
        (agency_id,),
    )


def send_message(agency_id: int, sender: str, sender_role: str, message: str):
    conn = db.get_conn()
    conn.execute(
        "INSERT INTO helpdesk_messages (agency_id, sender, sender_role, message, created_at) VALUES (?,?,?,?,?)",
        (agency_id, sender, sender_role, message, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()


def list_all_conversations():
    return _df(
        "SELECT DISTINCT h.agency_id, a.name AS agency_name FROM helpdesk_messages h "
        "JOIN agencies a ON a.id = h.agency_id"
    )
