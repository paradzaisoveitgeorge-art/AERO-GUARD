"""AERO-GUARD Flask clone of the Lovable-built provider console.

Ported page by page from lovable_source/ (TanStack Start + React).
See ../BUILD_PLAN.md for build order and progress.
"""
import os
import random

from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)

COUNTRIES = ["ZW", "ZA", "KE", "UG", "TZ", "NG", "GH", "ET", "RW", "BW"]
POLICY_TEMPLATES = ["Standard Compliance", "Full Enterprise", "Trial / Lite", "Custom"]
CURRENCIES = ["USD", "EUR", "ZAR", "KES", "UGX", "NGN", "GHS", "ZWL", "RWF"]

AGENCIES = [
    {"id": "AG-1001", "name": "Skylink Travel", "pcc": "7XQ9", "gds": "1G", "country": "ZW", "seats": 25, "used_seats": 22, "status": "ACTIVE", "month_adms": 2, "last_active": "3 min ago", "policy_level": "STANDARD", "admin_email": "admin@skylink.zw"},
    {"id": "AG-1002", "name": "Voyage Africa", "pcc": "K3P1", "gds": "1G", "country": "ZA", "seats": 60, "used_seats": 55, "status": "ACTIVE", "month_adms": 7, "last_active": "12 min ago", "policy_level": "ENTERPRISE", "admin_email": "ops@voyage.co.za"},
    {"id": "AG-1003", "name": "BlueSky Holidays", "pcc": "QM44", "gds": "1A", "country": "KE", "seats": 15, "used_seats": 9, "status": "TRIAL", "month_adms": 0, "last_active": "1 hr ago", "policy_level": "BASIC", "admin_email": "info@bluesky.ke"},
    {"id": "AG-1004", "name": "Continental Tours", "pcc": "B2H7", "gds": "1G", "country": "ZW", "seats": 12, "used_seats": 11, "status": "SUSPENDED", "month_adms": 14, "last_active": "4 days ago", "policy_level": "STANDARD", "admin_email": "tt@continental.zw"},
    {"id": "AG-1005", "name": "Equator Travel", "pcc": "EQ12", "gds": "1A", "country": "UG", "seats": 8, "used_seats": 0, "status": "PROVISIONING", "month_adms": 0, "last_active": "—", "policy_level": "BASIC", "admin_email": "admin@equator.ug"},
    {"id": "AG-1006", "name": "Mara Routes", "pcc": "MR55", "gds": "1S", "country": "KE", "seats": 20, "used_seats": 4, "status": "ARCHIVED", "month_adms": 0, "last_active": "3 mo ago", "policy_level": "BASIC", "admin_email": "hello@mara.ke"},
]

HELPDESK_USERS = [
    {"id": "U-01", "name": "Soviet Moyo", "email": "soviet@aero-guard.io", "role": "ADMIN", "active": True, "mfa": True, "last_login": "now"},
    {"id": "U-02", "name": "Tariro Ncube", "email": "tariro@aero-guard.io", "role": "L2", "active": True, "mfa": True, "last_login": "2 hr ago"},
    {"id": "U-03", "name": "Kelvin Owusu", "email": "kelvin@aero-guard.io", "role": "L1", "active": True, "mfa": False, "last_login": "yesterday"},
    {"id": "U-04", "name": "Amina Yusuf", "email": "amina@aero-guard.io", "role": "L1", "active": False, "mfa": False, "last_login": "21 days ago"},
]

VOUCHERS = [
    {"id": "VCH-44021", "pax": "MOYO/SOVIET", "pnr": "X7K2QP", "ticket": "157-2244778899", "reason": "Schedule change >4h", "amount": 120, "currency": "USD", "payment": "REFUND", "card": "•••• 4421", "policy": "IROPS-A", "status": "ISSUED", "issued": "today"},
    {"id": "VCH-44020", "pax": "NCUBE/T MRS", "pnr": "RR81LM", "ticket": "157-2244778812", "reason": "Goodwill", "amount": 50, "currency": "USD", "payment": "VOUCHER", "card": "—", "policy": "GOODWILL", "status": "REDEEMED", "issued": "today"},
]

ESCALATIONS = [
    {"id": "ESC-7781", "agency": "Skylink Travel", "pnr": "X7K2QP", "subject": "PCC emulation failing — auth token expired", "level": "L2", "priority": "HIGH", "opened": "12 min ago", "status": "PENDING", "sla": "48 min left"},
    {"id": "ESC-7780", "agency": "Voyage Africa", "pnr": "RR81LM", "subject": "ADM dispute QR/2510 — needs evidence pack", "level": "VENDOR", "priority": "HIGH", "opened": "1 hr ago", "status": "OPEN", "sla": "3 hr left"},
    {"id": "ESC-7779", "agency": "BlueSky Holidays", "pnr": "—", "subject": "Onboarding: SSO not redirecting", "level": "L1", "priority": "MED", "opened": "3 hr ago", "status": "OPEN", "sla": "21 hr left"},
]

POLICY_DOCS = [
    {"cat": "GDS", "name": "Galileo 1G Terms of Use", "v": "2025.06"},
    {"cat": "GDS", "name": "Amadeus 1A Agreement", "v": "2025.04"},
    {"cat": "NDC", "name": "NDC Distribution Agreement", "v": "v21"},
    {"cat": "OTA", "name": "OTA Connectivity Standards", "v": "2024.11"},
    {"cat": "AERO-GUARD", "name": "Acceptable Use Policy", "v": "2025.05"},
    {"cat": "AERO-GUARD", "name": "Data Processing Addendum", "v": "2025.02"},
]

NAV_GROUPS = [
    {"label": "OVERVIEW", "items": [
        {"key": "DASHBOARD", "label": "Dashboard", "icon": "▦", "endpoint": "provider_dashboard"},
    ]},
    {"label": "OPERATIONAL CONTROL", "items": [
        {"key": "AGENCIES", "label": "Agency Provisioning", "icon": "\U0001f3e2", "endpoint": "provider_agencies"},
        {"key": "USERS", "label": "Helpdesk Users", "icon": "\U0001f465", "endpoint": "provider_users"},
        {"key": "VOUCHERS", "label": "Vouchers", "icon": "\U0001f39f", "endpoint": "provider_vouchers"},
    ]},
    {"label": "INTELLIGENCE", "items": [
        {"key": "AUDITS", "label": "Agency ADM Audits", "icon": "\U0001f4ca", "endpoint": "provider_audits"},
    ]},
    {"label": "SUPPORT TOOLS", "items": [
        {"key": "ESCALATIONS", "label": "Escalations", "icon": "⚠", "endpoint": "provider_escalations"},
        {"key": "EMULATE", "label": "Emulate into PCC", "icon": "⌨", "endpoint": "provider_emulate"},
        {"key": "RESPOND", "label": "Respond to Clients", "icon": "\U0001f4ac", "endpoint": "provider_respond"},
    ]},
    {"label": "KNOWLEDGE", "items": [
        {"key": "LEARNING", "label": "My Learning", "icon": "\U0001f393", "endpoint": "provider_learning"},
        {"key": "POLICIES", "label": "Terms & Policies", "icon": "\U0001f4dc", "endpoint": "provider_policies"},
    ]},
]

ALERTS = [
    {"id": "A1", "severity": "CRIT", "source": "1G GALILEO", "title": "Intermittent timeouts on AP-2 host", "time": "14:02", "ongoing": True, "impacted_agencies": 23},
    {"id": "A2", "severity": "WARN", "source": "QR AIRWAYS", "title": "DOH ground stop — IROPS protective rebooking advised", "time": "13:41", "ongoing": True, "impacted_agencies": 8},
    {"id": "A3", "severity": "INFO", "source": "AERO-GUARD", "title": "NCP rules v4.12 published (EK, ET, WB)", "time": "11:20", "ongoing": False, "impacted_agencies": 45},
    {"id": "A4", "severity": "WARN", "source": "ET AIRLINES", "title": "Schedule change wave — 312 PNRs require action", "time": "09:15", "ongoing": True, "impacted_agencies": 14},
]

PENDING_ISSUES = [
    {"id": "P-1", "agency": "Skylink Travel", "type": "DOCS SSR", "summary": "Passport hyphen rejected — 3 PAX", "age": "8 min", "priority": "HIGH"},
    {"id": "P-2", "agency": "Voyage Africa", "type": "ADM Dispute", "summary": "QR/2510 evidence pack pending", "age": "1 hr", "priority": "HIGH"},
    {"id": "P-3", "agency": "BlueSky Holidays", "type": "Onboarding", "summary": "SSO redirect failing", "age": "3 hr", "priority": "MED"},
    {"id": "P-4", "agency": "Continental Tours", "type": "Voucher", "summary": "VCH-44018 awaiting approval >$500", "age": "5 hr", "priority": "MED"},
]


def render_provider(template_name, active_nav, **context):
    groups = [
        {
            "label": g["label"],
            "items": [
                {**item, "url": url_for(item["endpoint"])} for item in g["items"]
            ],
        }
        for g in NAV_GROUPS
    ]
    return render_template(template_name, nav_groups=groups, active_nav=active_nav, **context)


SMARTPOINT_VOUCHERS = [
    {"id": "VCH-44021", "tier": "Platinum", "pax": "DEMHE/PATRICK", "amount": 850, "currency": "USD", "status": "Active", "airline": "QR", "expires": "31DEC25", "policy_ref": "QR-PLT-2024-A"},
    {"id": "VCH-44018", "tier": "Gold", "pax": "NCUBE/THANDIWE", "amount": 420, "currency": "USD", "status": "Pending", "airline": "FN", "expires": "15NOV25", "policy_ref": "FN-GLD-2024-B"},
    {"id": "VCH-44012", "tier": "Silver", "pax": "MOYO/TANAKA", "amount": 180, "currency": "USD", "status": "Redeemed", "airline": "FN", "expires": "01JUL25", "policy_ref": "FN-SLV-2024-C"},
]

TUTORIALS = [
    {"id": "passport-scan", "title": "Passport Auto-Fill & MRZ Scan", "blurb": "Drop a passport image — AERO-GUARD reads the MRZ, validates ICAO 9303, and pushes DOCS SSR to the PNR. Zero spelling errors.", "duration": "1:42", "tag": "DOCS · OCR"},
    {"id": "pnr-validator", "title": "Live PNR Rule Validator", "blurb": "Watch AERO-GUARD intercept a min-stay breach mid-pricing and suggest the compliant fare basis before ticketing.", "duration": "2:15", "tag": "ADM · Rules"},
    {"id": "adm-watch", "title": "ADM Watch & Voucher Issuance", "blurb": "End-to-end demo: catch a tax-code violation, issue a goodwill voucher, and audit the trail from the helpdesk console.", "duration": "2:58", "tag": "Vouchers · Audit"},
]


@app.route("/")
def smartpoint_demo():
    return render_template("smartpoint.html", vouchers=SMARTPOINT_VOUCHERS, tutorials=TUTORIALS)


@app.route("/provider")
def provider_dashboard():
    adms_prevented = 12
    return render_provider(
        "provider/dashboard.html",
        "DASHBOARD",
        adms_prevented=adms_prevented,
        dollar_saved=adms_prevented * 350,
        alerts=ALERTS,
        pending_issues=PENDING_ISSUES,
    )


SORT_KEYS = {
    "name": lambda a: a["name"].lower(),
    "seats": lambda a: (a["used_seats"] / a["seats"]) if a["seats"] else 0,
    "adms": lambda a: a["month_adms"],
    "lastActive": lambda a: a["last_active"],
}


@app.route("/provider/agencies")
def provider_agencies():
    filter_gds = request.args.get("gds", "ALL")
    filter_country = request.args.get("country", "ALL")
    filter_policy = request.args.get("policy", "ALL")
    sort_by = request.args.get("sort", "name")
    sort_dir = request.args.get("dir", "asc")

    rows = [
        a for a in AGENCIES
        if (filter_gds == "ALL" or a["gds"] == filter_gds)
        and (filter_country == "ALL" or a["country"] == filter_country)
        and (filter_policy == "ALL" or a["policy_level"] == filter_policy)
    ]
    rows.sort(key=SORT_KEYS.get(sort_by, SORT_KEYS["name"]), reverse=(sort_dir == "desc"))

    def sort_url(key):
        next_dir = "desc" if (sort_by == key and sort_dir == "asc") else "asc"
        return url_for("provider_agencies", gds=filter_gds, country=filter_country, policy=filter_policy, sort=key, dir=next_dir)

    return render_provider(
        "provider/agencies.html",
        "AGENCIES",
        agencies=rows,
        countries=COUNTRIES,
        policy_templates=POLICY_TEMPLATES,
        filter_gds=filter_gds,
        filter_country=filter_country,
        filter_policy=filter_policy,
        sort_by=sort_by,
        sort_dir=sort_dir,
        sort_url=sort_url,
        querystring=request.query_string.decode(),
    )


@app.route("/provider/agencies/provision", methods=["POST"])
def provision_agency():
    new_id = f"AG-{random.randint(1000, 9999)}"
    AGENCIES.insert(0, {
        "id": new_id,
        "name": request.form.get("name") or "Unnamed",
        "pcc": (request.form.get("pcc") or "XXXX").upper(),
        "gds": request.form.get("gds") or "1G",
        "country": request.form.get("country") or "ZW",
        "seats": int(request.form.get("seats") or 10),
        "used_seats": 0,
        "status": "TRIAL" if request.form.get("mode") == "TRIAL" else "PROVISIONING",
        "month_adms": 0,
        "last_active": "—",
        "policy_level": (request.form.get("policy") or "Standard Compliance"),
        "admin_email": request.form.get("admin_email") or "",
    })
    return redirect(url_for("provider_agencies"))


@app.route("/provider/agencies/<agency_id>/toggle-suspend", methods=["POST"])
def toggle_suspend_agency(agency_id):
    for a in AGENCIES:
        if a["id"] == agency_id:
            a["status"] = "ACTIVE" if a["status"] == "SUSPENDED" else "SUSPENDED"
            break
    return redirect(request.referrer or url_for("provider_agencies"))


@app.route("/provider/agencies/<agency_id>/delete", methods=["POST"])
def delete_agency(agency_id):
    AGENCIES[:] = [a for a in AGENCIES if a["id"] != agency_id]
    return redirect(request.referrer or url_for("provider_agencies"))


@app.route("/provider/agencies/bulk", methods=["POST"])
def bulk_agency_action():
    action = request.form.get("action")
    ids = set(request.form.getlist("ids"))
    if action == "DELETE":
        AGENCIES[:] = [a for a in AGENCIES if a["id"] not in ids]
    elif action in ("SUSPEND", "REACTIVATE"):
        new_status = "SUSPENDED" if action == "SUSPEND" else "ACTIVE"
        for a in AGENCIES:
            if a["id"] in ids:
                a["status"] = new_status
    return redirect(request.referrer or url_for("provider_agencies"))


ROLE_HINTS = {
    "L1": "Ticket support, view dashboards, respond to clients",
    "L2": "Above + Emulate PCC, escalate to vendors, manage vouchers",
    "ADMIN": "Full control: provision agencies, manage users, audit trail",
}


@app.route("/provider/users")
def provider_users():
    return render_provider("provider/users.html", "USERS", users=HELPDESK_USERS, role_hints=ROLE_HINTS)


@app.route("/provider/users/invite", methods=["POST"])
def invite_user():
    new_id = f"U-{random.randint(10, 99)}"
    HELPDESK_USERS.insert(0, {
        "id": new_id,
        "name": request.form.get("name") or "Unnamed",
        "email": request.form.get("email") or "",
        "role": request.form.get("role") or "L1",
        "active": True,
        "mfa": False,
        "last_login": "never",
    })
    return redirect(url_for("provider_users"))


@app.route("/provider/users/<user_id>/toggle-active", methods=["POST"])
def toggle_user_active(user_id):
    for u in HELPDESK_USERS:
        if u["id"] == user_id:
            u["active"] = not u["active"]
            break
    return redirect(request.referrer or url_for("provider_users"))


@app.route("/provider/users/<user_id>/remove", methods=["POST"])
def remove_user(user_id):
    HELPDESK_USERS[:] = [u for u in HELPDESK_USERS if u["id"] != user_id]
    return redirect(request.referrer or url_for("provider_users"))


VOUCHER_REASONS = ["Schedule change >4h", "Flight cancellation", "ADM dispute", "Goodwill", "IROPS rebooking"]
VOUCHER_POLICIES = ["IROPS-A", "IROPS-B", "GOODWILL", "ADM-OFFSET", "LOYALTY"]
VOUCHER_PAYMENTS = ["REFUND", "VOUCHER", "CREDIT NOTE", "CASH", "TRANSFER"]


@app.route("/provider/vouchers")
def provider_vouchers():
    search = request.args.get("q", "").strip().upper()
    rows = [
        v for v in VOUCHERS
        if not search or search in v["id"] or search in v["pnr"] or search in v["pax"]
    ]
    return render_provider(
        "provider/vouchers.html",
        "VOUCHERS",
        vouchers=rows,
        search=request.args.get("q", ""),
        reasons=VOUCHER_REASONS,
        policies=VOUCHER_POLICIES,
        payments=VOUCHER_PAYMENTS,
        currencies=CURRENCIES,
    )


@app.route("/provider/vouchers/issue", methods=["POST"])
def issue_voucher():
    amount = float(request.form.get("amount") or 0)
    VOUCHERS.insert(0, {
        "id": f"VCH-{random.randint(10000, 99999)}",
        "pax": (request.form.get("pax") or "").upper(),
        "pnr": (request.form.get("pnr") or "").upper(),
        "ticket": request.form.get("ticket") or "",
        "reason": request.form.get("reason") or "",
        "amount": amount,
        "currency": request.form.get("currency") or "USD",
        "payment": request.form.get("payment") or "REFUND",
        "card": request.form.get("card") or "—",
        "policy": request.form.get("policy") or "GOODWILL",
        "status": "ISSUED",
        "issued": "just now",
    })
    return redirect(url_for("provider_vouchers"))


@app.route("/provider/vouchers/export.csv")
def export_vouchers_csv():
    import csv
    import io

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["ID", "Pax", "PNR", "Ticket", "Reason", "Amount", "Currency", "Payment", "Policy", "Status"])
    for v in VOUCHERS:
        writer.writerow([v["id"], v["pax"], v["pnr"], v["ticket"], v["reason"], v["amount"], v["currency"], v["payment"], v["policy"], v["status"]])

    from flask import Response
    return Response(
        buf.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=vouchers.csv"},
    )


REASON_DIST = [
    {"label": "Duplicate booking", "pct": 32, "color": "bar-rose"},
    {"label": "Fare rule violation", "pct": 24, "color": "bar-amber"},
    {"label": "Time limit expiry", "pct": 18, "color": "bar-indigo"},
    {"label": "Schedule change", "pct": 14, "color": "bar-sky"},
    {"label": "Other", "pct": 12, "color": "bar-slate"},
]

DRILLDOWN_RULES = [
    {"code": "FXR-103", "tone": "amber", "text": "Fare basis mismatch · 4 PNRs · est $1,600"},
    {"code": "TKT-204", "tone": "rose", "text": "Ticketing time limit expired · 2 PNRs · est $800"},
    {"code": "NCP-011", "tone": "indigo", "text": "Name change post-ticketing · 1 PNR · est $320"},
]


@app.route("/provider/audits")
def provider_audits():
    range_ = request.args.get("range", "WEEK")
    filter_agency = request.args.get("agency", "ALL")
    sort_health = request.args.get("sortHealth") == "1"
    drill = request.args.get("drill")

    rows = []
    for a in AGENCIES:
        if filter_agency != "ALL" and a["name"] != filter_agency:
            continue
        adms = a["month_adms"]
        health = "AT-RISK" if adms > 10 else ("WATCH" if adms > 3 else "HEALTHY")
        rows.append({
            "agency": a["name"], "pcc": a["pcc"], "adms": adms,
            "saved": adms * 1800 + 4000, "lost": adms * 400,
            "health": health, "trend": "↑" if adms > 5 else "↓",
        })
    if sort_health:
        order = {"AT-RISK": 0, "WATCH": 1, "HEALTHY": 2}
        rows.sort(key=lambda r: order[r["health"]])

    return render_provider(
        "provider/audits.html",
        "AUDITS",
        range=range_,
        filter_agency=filter_agency,
        sort_health=sort_health,
        agency_names=[a["name"] for a in AGENCIES],
        rows=rows,
        reason_dist=REASON_DIST,
        drill=drill,
        drilldown_rules=DRILLDOWN_RULES,
    )


@app.route("/provider/escalations")
def provider_escalations():
    return render_provider(
        "provider/escalations.html",
        "ESCALATIONS",
        escalations=ESCALATIONS,
        agency_names=[a["name"] for a in AGENCIES],
        escalate_id=request.args.get("escalate"),
        escalate_to=request.args.get("to"),
        show_new=request.args.get("new") == "1",
    )


@app.route("/provider/escalations/new", methods=["POST"])
def new_escalation():
    ESCALATIONS.insert(0, {
        "id": f"ESC-{random.randint(7000, 7999)}",
        "agency": request.form.get("agency") or "All agencies",
        "pnr": (request.form.get("pnr") or "—").upper(),
        "subject": request.form.get("subject") or "",
        "level": "L1",
        "priority": request.form.get("priority") or "MED",
        "opened": "just now",
        "status": "OPEN",
        "sla": "24 hr left",
    })
    return redirect(url_for("provider_escalations"))


@app.route("/provider/escalations/<esc_id>/escalate", methods=["POST"])
def escalate_escalation(esc_id):
    to = request.form.get("to") or "L2"
    for e in ESCALATIONS:
        if e["id"] == esc_id:
            e["status"] = "PENDING"
            e["level"] = to
            break
    return redirect(url_for("provider_escalations"))


@app.route("/provider/escalations/<esc_id>/resolve", methods=["POST"])
def resolve_escalation(esc_id):
    for e in ESCALATIONS:
        if e["id"] == esc_id:
            e["status"] = "RESOLVED"
            break
    return redirect(url_for("provider_escalations"))


@app.route("/provider/policies")
def provider_policies():
    return render_provider("provider/policies.html", "POLICIES", docs=POLICY_DOCS)


@app.route("/provider/emulate")
def provider_emulate():
    return render_provider("provider/emulate.html", "EMULATE")


THREADS = [
    {
        "id": "T-91", "agency": "Skylink Travel", "agent": "Rumbi", "unread": 2,
        "last": "Need help on a DOCS SSR reject",
        "messages": [
            {"from": "AGENT", "text": "DOCS SSR keeps rejecting — passport name has hyphen", "t": "14:01"},
            {"from": "AGENT", "text": "Need help on a DOCS SSR reject", "t": "14:02"},
        ],
    },
    {
        "id": "T-90", "agency": "Voyage Africa", "agent": "Tendai", "unread": 0,
        "last": "Voucher not received by pax",
        "messages": [
            {"from": "AGENT", "text": "Voucher VCH-44021 not received by pax", "t": "13:30"},
            {"from": "OPS", "text": "Resent — please confirm", "t": "13:35"},
        ],
    },
]


@app.route("/provider/respond")
def provider_respond():
    active_id = request.args.get("thread", THREADS[0]["id"])
    active = next((t for t in THREADS if t["id"] == active_id), THREADS[0])
    return render_provider("provider/respond.html", "RESPOND", threads=THREADS, active=active)


@app.route("/provider/respond/<thread_id>/reply", methods=["POST"])
def reply_thread(thread_id):
    text = request.form.get("text", "").strip()
    if text:
        for t in THREADS:
            if t["id"] == thread_id:
                t["messages"].append({"from": "OPS", "text": text, "t": "now"})
                break
    return redirect(url_for("provider_respond"))


LEARNING_MODULES = [
    {"name": "NCP Validator Fundamentals", "progress": 100, "badge": "✓ Done"},
    {"name": "DOCS SSR Edge Cases", "progress": 75, "badge": "In progress"},
    {"name": "NDC Order Management", "progress": 60, "badge": "In progress"},
    {"name": "ADM Dispute Mastery", "progress": 0, "badge": "Not started"},
]


@app.route("/provider/learning")
def provider_learning():
    return render_provider("provider/learning.html", "LEARNING", modules=LEARNING_MODULES)


if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5050)))
