"""Generate AERO-GUARD progress report PDF for the client."""
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path(__file__).parent / "AERO-GUARD_Progress_Report.pdf"

# ---- Brand palette ----
INDIGO = colors.HexColor("#4c6bff")
INDIGO_DARK = colors.HexColor("#2541b2")
INK = colors.HexColor("#0f1530")
SLATE_700 = colors.HexColor("#334155")
SLATE_500 = colors.HexColor("#64748b")
SLATE_300 = colors.HexColor("#cbd5e1")
SLATE_100 = colors.HexColor("#f1f5f9")
EMERALD = colors.HexColor("#10b981")
AMBER = colors.HexColor("#f59e0b")
ROSE = colors.HexColor("#e11d48")
CARD_BG = colors.HexColor("#f5f7fb")

# ---- Styles ----
styles = getSampleStyleSheet()

S_TITLE = ParagraphStyle(
    "title", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=32, leading=38, textColor=INK, alignment=TA_LEFT, spaceAfter=6,
)
S_SUBTITLE = ParagraphStyle(
    "subtitle", parent=styles["Normal"], fontName="Helvetica",
    fontSize=14, textColor=SLATE_500, leading=18, spaceAfter=24,
)
S_H1 = ParagraphStyle(
    "h1", parent=styles["Heading1"], fontName="Helvetica-Bold",
    fontSize=20, leading=24, textColor=INDIGO_DARK, spaceBefore=4, spaceAfter=10,
)
S_H2 = ParagraphStyle(
    "h2", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=14, leading=18, textColor=INK, spaceBefore=12, spaceAfter=4,
)
S_BODY = ParagraphStyle(
    "body", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=10.5, leading=15, textColor=SLATE_700, spaceAfter=6,
)
S_BULLET = ParagraphStyle(
    "bullet", parent=S_BODY, leftIndent=14, firstLineIndent=-10,
    spaceAfter=3, leading=14,
)
S_TAG = ParagraphStyle(
    "tag", parent=styles["Normal"], fontName="Helvetica-Bold",
    fontSize=8, textColor=colors.white, alignment=TA_CENTER, leading=11,
)
S_KICKER = ParagraphStyle(
    "kicker", parent=styles["Normal"], fontName="Helvetica-Bold",
    fontSize=9, textColor=INDIGO, leading=11, spaceAfter=2,
)
S_MUTED = ParagraphStyle(
    "muted", parent=S_BODY, fontSize=9, textColor=SLATE_500,
)
S_COVER_LINE = ParagraphStyle(
    "cover-line", parent=styles["Normal"], fontName="Helvetica",
    fontSize=11, textColor=SLATE_500, leading=16,
)


def header_footer(canvas, doc):
    canvas.saveState()
    # Top accent bar
    canvas.setFillColor(INDIGO)
    canvas.rect(0, A4[1] - 6, A4[0], 6, stroke=0, fill=1)
    # Footer
    canvas.setFillColor(SLATE_500)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(2 * cm, 1.2 * cm, "AERO-GUARD — Prototype Progress Report")
    canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Page {doc.page}")
    canvas.restoreState()


def cover_template(canvas, doc):
    canvas.saveState()
    # Full-bleed dark header
    canvas.setFillColor(INK)
    canvas.rect(0, A4[1] - 14 * cm, A4[0], 14 * cm, stroke=0, fill=1)
    # Logo badge
    canvas.setFillColor(INDIGO)
    canvas.roundRect(2 * cm, A4[1] - 4.2 * cm, 2.6 * cm, 2.6 * cm, 8, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 26)
    canvas.drawCentredString(3.3 * cm, A4[1] - 3.1 * cm, "AG")
    # Brand text
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 22)
    canvas.drawString(5.4 * cm, A4[1] - 2.5 * cm, "AERO-GUARD")
    canvas.setFillColor(SLATE_300)
    canvas.setFont("Helvetica", 11)
    canvas.drawString(5.4 * cm, A4[1] - 3.1 * cm, "Compliance in Motion, Profit in Motive")
    # Tagline divider
    canvas.setStrokeColor(INDIGO)
    canvas.setLineWidth(2)
    canvas.line(2 * cm, A4[1] - 5.5 * cm, 6 * cm, A4[1] - 5.5 * cm)
    # Footer
    canvas.setFillColor(SLATE_500)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(2 * cm, 1.2 * cm, "Confidential — prepared for client review")
    canvas.restoreState()


# ---- Helpers ----

def tag(text, bg):
    table = Table(
        [[Paragraph(text, S_TAG)]], colWidths=[3.0 * cm], rowHeights=[0.55 * cm],
    )
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("ROUNDEDCORNERS", [3, 3, 3, 3]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return table


def section_card(num, title, kicker, body_lines, status_tag):
    """A single-section block: numbered chip + title + kicker + body bullets + tag."""
    parts = []
    # Title row: [num chip] [title] [status tag]
    num_chip = Table(
        [[Paragraph(f"<font color='white'><b>{num}</b></font>", S_TAG)]],
        colWidths=[1.0 * cm], rowHeights=[1.0 * cm],
    )
    num_chip.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), INDIGO),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))
    header = Table(
        [[num_chip, Paragraph(title, S_H1), status_tag]],
        colWidths=[1.2 * cm, 11.5 * cm, 3.3 * cm],
    )
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (2, 0), (2, 0), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    parts.append(header)
    parts.append(Paragraph(kicker, S_KICKER))
    for ln in body_lines:
        parts.append(Paragraph(f"• {ln}", S_BULLET))
    parts.append(Spacer(1, 8))
    return parts


# ---- Build document ----

doc = BaseDocTemplate(
    str(OUT), pagesize=A4,
    leftMargin=2 * cm, rightMargin=2 * cm,
    topMargin=2 * cm, bottomMargin=2 * cm,
    title="AERO-GUARD Prototype Progress Report",
    author="AERO-GUARD",
)

cover_frame = Frame(2 * cm, 2 * cm, A4[0] - 4 * cm, A4[1] - 6 * cm, id="cover")
content_frame = Frame(2 * cm, 2 * cm, A4[0] - 4 * cm, A4[1] - 4 * cm, id="content")

doc.addPageTemplates([
    PageTemplate(id="cover", frames=[cover_frame], onPage=cover_template),
    PageTemplate(id="content", frames=[content_frame], onPage=header_footer),
])

story = []

# ---------------- COVER ----------------
story.append(Spacer(1, 10 * cm))  # push content below the dark header
story.append(Paragraph("Prototype Progress Report", S_TITLE))
story.append(Paragraph("MVP build — Sections 1 through 7 complete", S_SUBTITLE))
story.append(Spacer(1, 0.8 * cm))
story.append(Paragraph(f"Date: {date.today().strftime('%d %B %Y')}", S_COVER_LINE))
story.append(Paragraph("Prepared by: Curtis L.Y. Kasukusa", S_COVER_LINE))
story.append(Paragraph("Prototype URL: aeroguard_flask/ — runs on Python 3.11 + Flask", S_COVER_LINE))
story.append(Spacer(1, 1.6 * cm))

# Headline stats card
stats_data = [
    [Paragraph("<b>7</b>", ParagraphStyle("stat", fontSize=22, fontName="Helvetica-Bold", textColor=INDIGO_DARK, alignment=TA_CENTER, leading=24)),
     Paragraph("<b>58</b>", ParagraphStyle("stat", fontSize=22, fontName="Helvetica-Bold", textColor=INDIGO_DARK, alignment=TA_CENTER, leading=24)),
     Paragraph("<b>6</b>", ParagraphStyle("stat", fontSize=22, fontName="Helvetica-Bold", textColor=INDIGO_DARK, alignment=TA_CENTER, leading=24))],
    [Paragraph("sections complete", ParagraphStyle("statl", fontSize=9, textColor=SLATE_500, alignment=TA_CENTER, leading=11)),
     Paragraph("engineering tasks shipped", ParagraphStyle("statl", fontSize=9, textColor=SLATE_500, alignment=TA_CENTER, leading=11)),
     Paragraph("technical docs written", ParagraphStyle("statl", fontSize=9, textColor=SLATE_500, alignment=TA_CENTER, leading=11))],
]
stats = Table(stats_data, colWidths=[5.6 * cm] * 3, rowHeights=[1.4 * cm, 0.7 * cm])
stats.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), CARD_BG),
    ("BOX", (0, 0), (-1, -1), 0.5, SLATE_300),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
]))
story.append(stats)

story.append(PageBreak())

# ---------------- EXEC SUMMARY ----------------
story.append(Paragraph("Executive summary", S_H1))
story.append(Paragraph(
    "AERO-GUARD is a compliance and revenue-protection tool for travel agencies. "
    "It plugs into a GDS (Galileo, Amadeus, Sabre) terminal to catch fare-rule "
    "violations <i>before</i> they trigger airline ADMs (Agency Debit Memos), "
    "automates passport-to-PNR data entry, and gives the provider company a "
    "helpdesk console for agencies, vouchers, escalations and audits.",
    S_BODY,
))
story.append(Paragraph(
    "The brief was to evolve the visual prototype into a functional MVP that the "
    "client can pitch to travel agencies and airlines. This report covers the first "
    "seven sections of that build. The result is a real multi-tenant SaaS with "
    "authentication, role-based permissions, isolated tenants, an audit trail, "
    "and a live event stream that makes the dashboard feel like a production system.",
    S_BODY,
))

story.append(Paragraph("What this prototype can now do", S_H2))
for line in [
    "Three provider companies (AERO-GUARD HQ, SkyOps Africa, Horizon GDS Partners) and one travel-agency consultant can log in with their own credentials.",
    "Each provider only ever sees their own agencies, vouchers, escalations and helpdesk staff — strict cross-tenant isolation.",
    "Three role tiers (ADMIN, L2, L1) gate destructive actions; junior staff are prevented from provisioning, deleting or invoking high-value vouchers.",
    "Every state change is recorded in an append-only audit log — visible to admins with filters by action, actor and date.",
    "A simulated GDS event stream injects ADM catches, voucher issuances and alert refreshes every 45–90 seconds — the dashboard moves on its own.",
    "One click resets all demo data to a clean baseline before each pitch.",
    "Demo data persists across server restarts; SQLite locally, Postgres-ready for production.",
]:
    story.append(Paragraph(f"• {line}", S_BULLET))

story.append(Paragraph("What is deliberately simulated", S_H2))
story.append(Paragraph(
    "The prototype does <b>not</b> connect to a real GDS. GDS access requires signed "
    "reseller agreements with Travelport / Amadeus / Sabre, KYC, insurance and a "
    "multi-month onboarding. For pitches, the simulated event stream demonstrates "
    "the workflow convincingly without the regulatory burden. The architecture is "
    "designed so a real GDS adapter can drop into the same event-handling code.",
    S_BODY,
))

story.append(PageBreak())

# ---------------- WHAT WE BUILT (table of sections) ----------------
story.append(Paragraph("What we built, section by section", S_H1))
story.append(Paragraph(
    "The build plan has thirteen sections. Sections 1–7 are complete. Sections 8–12 "
    "wrap deployment, the public landing page and production hardening — work that "
    "does not change the product, just how customers reach it.",
    S_BODY,
))

map_data = [
    ["§", "Section", "Status"],
    ["1", "Project hygiene — requirements, env vars, Procfile, secrets", "Done"],
    ["2", "Database — SQLAlchemy, migrations, seed, persistence", "Done"],
    ["3", "Authentication — login, sessions, CSRF, rate limiting", "Done"],
    ["4", "Roles & permissions — ADMIN / L2 / L1 matrix", "Done"],
    ["5", "Multi-tenancy — strict per-provider data isolation", "Done"],
    ["6", "Workflow polish — real timestamps, audit log UI, reset", "Done"],
    ["7", "Live event stream — background scheduler, dashboard widget", "Done"],
    ["8", "Reports — CSV exports across ADM savings + SLA stats", "Planned"],
    ["9", "Deployment — Render hosting, custom domain, HTTPS", "Planned"],
    ["10", "Public landing page, About, Privacy, Terms", "Planned"],
    ["11", "Backups, error tracking (Sentry), uptime monitoring", "Planned"],
    ["12", "Hardening — CSP, HSTS, Redis-backed scheduler", "Planned"],
    ["13", "Demo-readiness pass — script, Loom video, pitch deck", "Planned"],
]

map_table = Table(map_data, colWidths=[1.0 * cm, 12.7 * cm, 2.3 * cm])
map_table.setStyle(TableStyle([
    ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 10),
    ("BACKGROUND", (0, 0), (-1, 0), INK),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("ALIGN", (0, 0), (0, -1), "CENTER"),
    ("ALIGN", (2, 0), (2, -1), "CENTER"),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("FONT", (0, 1), (-1, -1), "Helvetica", 9.5),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CARD_BG]),
    ("GRID", (0, 0), (-1, -1), 0.25, SLATE_300),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    # Status column color
    ("TEXTCOLOR", (2, 1), (2, 7), EMERALD),
    ("TEXTCOLOR", (2, 8), (2, -1), SLATE_500),
    ("FONT", (2, 1), (2, 7), "Helvetica-Bold", 9.5),
]))
story.append(map_table)

story.append(PageBreak())

# ---------------- SECTION CARDS ----------------
DONE_TAG = tag("DONE", EMERALD)

sections = [
    (
        "1", "Project hygiene",
        "The kitchen, ready for guests",
        [
            "<b>requirements.txt</b> with pinned versions — anyone can clone the repo and run it without hunting for the right Flask version.",
            "<b>Procfile</b> tells Render / Railway exactly how to start the server in production (gunicorn, two workers).",
            "<b>.env.example</b> documents which secret settings the app expects (SECRET_KEY, FLASK_ENV, PORT) — the real .env is gitignored.",
            "Secrets read from environment variables. The app <b>refuses to start in production without a SECRET_KEY</b> — eliminates the &quot;forgot to change the default password&quot; class of bug.",
            "Debug mode automatically off in production.",
        ],
    ),
    (
        "2", "Database & persistence",
        "Data that survives restarts",
        [
            "<b>13 tables</b> defined in models.py — providers, users, agencies, vouchers, escalations, threads, messages, audit logs, plus shared catalogs.",
            "<b>SQLAlchemy + Alembic migrations</b> — when the schema changes, an automatic recipe file updates every environment (laptop, staging, production) to match.",
            "<b>SQLite locally, Postgres-ready</b> — switching is one environment variable, no code change.",
            "<b>Soft delete</b> on agencies — removing them preserves history so audit logs never reference dead pointers.",
            "<b>flask seed</b> and <b>flask reset-demo</b> commands — one-second recovery to a clean demo state.",
            "Every operational row carries a <b>provider_id</b> foreign key, ready for the tenant isolation that arrives in Section 5.",
        ],
    ),
    (
        "3", "Authentication",
        "A real front door",
        [
            "Login page at <b>/login</b>, branded, lists demo accounts for easy self-exploration during a pitch.",
            "<b>Passwords are hashed</b> with PBKDF2-SHA-256 — never stored as plaintext, never recoverable.",
            "Session cookies: <b>HttpOnly</b> (JS can't steal them), <b>SameSite=Lax</b> (other sites can't ride along), <b>Secure in production</b> (HTTPS-only).",
            "<b>CSRF protection</b> on every form — defeats the &quot;evil site tricks your browser&quot; attack.",
            "<b>Rate limiting</b> on /login (5 attempts/minute per IP) — brute-forcing the password becomes impractical.",
            "<b>Forgot password</b> flow with a 2-hour token; renders the link on screen in demo (email sending arrives in production).",
            "Five demo accounts ready: Provider Admin, Provider L2, Provider L1, an inactive user (to demo the disable flow), and a Consultant.",
        ],
    ),
    (
        "4", "Roles & permissions",
        "Defence in depth — UI, server, and tenancy each check",
        [
            "Four roles defined: <b>ADMIN, L2, L1, CONSULTANT</b> — with a single permission matrix as the source of truth.",
            "<b>19 actions</b> mapped to roles (agency:provision, voucher:issue, escalation:to_vendor, …) — easy to audit who can do what at a glance.",
            "<b>L1 voucher cap of $500</b> — junior staff can issue small goodwill vouchers; anything bigger requires L2 or Admin.",
            "Buttons users can't use <b>are hidden</b>; locked actions show a dim &quot;🔒&quot; chip so it's clear the feature exists.",
            "Even if a user crafts the request by hand, the <b>server re-checks</b> and returns 403 — defence in depth.",
            "Consultants cannot reach /provider/* at all — separate audience, separate door.",
        ],
    ),
    (
        "5", "Multi-tenancy",
        "Provider A never sees Provider B's data",
        [
            "Every list query is <b>tenant-scoped</b> automatically — Soviet's queries silently include &quot;WHERE provider = AERO-GUARD HQ&quot;.",
            "Every single-record lookup checks ownership — a cross-tenant ID returns <b>404, not 403</b>, so attackers can't probe other tenants' ID space.",
            "Bulk actions silently ignore IDs that aren't yours — no partial damage if a malicious ID is appended to the form.",
            "CSV exports only contain own data.",
            "<b>Audit log writes</b> on every state change — who did what, when, against what record, in which tenant.",
            "<b>TENANT chip</b> in the topbar shows the current tenancy context — eliminates &quot;wait, which account am I in?&quot; mistakes during demos.",
            "Self-protection: admins cannot disable or remove their own account.",
        ],
    ),
    (
        "6", "Workflow polish",
        "Real timestamps + a visible audit trail + one-click reset",
        [
            "Every &quot;3 min ago&quot; / &quot;today&quot; in the UI is now <b>computed from real datetimes</b> — not seeded strings that rot after a day.",
            "Login bumps <b>users.last_login_at</b>; mutations bump <b>updated_at</b>; SLA deadlines stored as real datetimes so &quot;48 min left&quot; is accurate.",
            "<b>Audit Log page</b> at /provider/audit-log (Admin only) — filter by action, by actor, by time window. Append-only.",
            "<b>Reset demo data</b> button on the dashboard — wipes every tenant, reseeds the baseline, signs out, sub-second.",
            "Dashboard hero personalised: &quot;Welcome to AERO-GUARD, Soviet · ADMIN · MFA verified · last login just now&quot;.",
            "&quot;ADMs Prevented&quot; counter now computed from real agency data instead of a hardcoded number.",
        ],
    ),
    (
        "7", "Live event stream",
        "The dashboard breathes",
        [
            "Background scheduler (APScheduler) injects <b>simulated GDS events every 45–90 seconds</b>: ADM catches, voucher issuances, alert refreshes.",
            "<b>Live Activity</b> card on the dashboard polls every 10 seconds and prepends new events with a fade-in animation.",
            "Pulsing green <b>LIVE</b> chip tells viewers this is not a screenshot.",
            "<b>⚡ Inject demo event</b> button (Admin only) — fire one event on cue for a specific pitch moment.",
            "Tenant-scoped — every provider sees a live feed of <b>their own</b> tenant's activity.",
            "Tunable cadence via env vars; full kill switch via AEROGUARD_STREAM=0.",
        ],
    ),
]

for s in sections:
    story.extend(section_card(s[0], s[1], s[2], s[3], DONE_TAG))
    if s[0] in ("3", "5", "7"):  # break before getting too crowded
        story.append(PageBreak())

# ---------------- WHAT'S NEXT ----------------
story.append(Paragraph("What's next", S_H1))
story.append(Paragraph(
    "The remaining sections do not change the product. They make it accessible at "
    "a public URL, observable in production, and presentable to a buyer.",
    S_BODY,
))
next_data = [
    ["§", "Section", "Why it matters for the pitch"],
    ["8",  "Reports & CSV exports",            "Hand prospects a downloadable summary they can email to their CFO."],
    ["9",  "Deploy to Render + custom domain", "Give the client a permanent https://aeroguard.io link they can share."],
    ["10", "Marketing landing page",            "A non-logged-in visitor sees a product story, not a login form."],
    ["11", "Backups, Sentry, uptime monitor",   "When something breaks, we know about it before the prospect does."],
    ["12", "Hardening — CSP, HSTS, scheduler",  "Production-grade security headers and horizontal-scale readiness."],
    ["13", "Pitch package",                     "5-slide deck, one-page brief, Loom walkthrough, list of 20 target agencies."],
]
nxt = Table(next_data, colWidths=[1.0 * cm, 5.2 * cm, 9.8 * cm])
nxt.setStyle(TableStyle([
    ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 10),
    ("BACKGROUND", (0, 0), (-1, 0), INK),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("ALIGN", (0, 0), (0, -1), "CENTER"),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("FONT", (0, 1), (-1, -1), "Helvetica", 9.5),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CARD_BG]),
    ("GRID", (0, 0), (-1, -1), 0.25, SLATE_300),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
]))
story.append(nxt)

# ---------------- TRY IT YOURSELF ----------------
story.append(Spacer(1, 14))
story.append(Paragraph("Try it yourself", S_H1))
story.append(Paragraph(
    "All demo accounts use the password <font face='Courier'><b>aeroguard</b></font>:",
    S_BODY,
))
creds = [
    ["Role",           "Email",                          "Lands on"],
    ["Provider Admin", "soviet@aero-guard.io",           "Provider console (full access)"],
    ["Provider L2",    "tariro@aero-guard.io",           "Provider console (no provisioning)"],
    ["Provider L1",    "kelvin@skyops.africa",           "Provider console (read + light actions)"],
    ["Inactive user",  "amina@horizon.partners",         "Login refused — disabled account demo"],
    ["Consultant",     "patrick@skylink.zw",             "Smartpoint terminal (cannot access /provider/*)"],
]
ct = Table(creds, colWidths=[3.2 * cm, 5.8 * cm, 7.0 * cm])
ct.setStyle(TableStyle([
    ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 10),
    ("BACKGROUND", (0, 0), (-1, 0), INDIGO_DARK),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("FONT", (0, 1), (-1, -1), "Helvetica", 9.5),
    ("FONT", (1, 1), (1, -1), "Courier", 9),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CARD_BG]),
    ("GRID", (0, 0), (-1, -1), 0.25, SLATE_300),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story.append(ct)

story.append(Spacer(1, 16))
story.append(Paragraph("Recommended demo path", S_H2))
for line in [
    "Sign in as <b>soviet@aero-guard.io</b> — land on the provider dashboard, point out the LIVE Activity card and the TENANT chip.",
    "Wait 30–60 seconds — a new ADM-caught event appears in the Live Activity card without anyone touching the screen.",
    "Click <b>⚡ Inject demo event</b> for a guaranteed event on cue.",
    "Visit <b>Intelligence → Audit Log</b> to show append-only history (with the event you just injected).",
    "Sign out, sign in as <b>kelvin@skyops.africa</b> — point out the &quot;🔒 Provision Agency&quot; lock and the missing Suspend/Delete buttons.",
    "Try to visit <b>/provider/agencies/AG-1001/delete</b> as Kelvin — 403 Access Denied.",
    "Sign out, sign in as <b>patrick@skylink.zw</b> — lands on the Smartpoint terminal, cannot reach /provider/* at all.",
    "Back as soviet — click <b>↻ Reset demo data</b> — everything snaps back to a clean baseline for the next prospect.",
]:
    story.append(Paragraph(f"• {line}", S_BULLET))

# ---- Render ----
doc.build(story)
print(f"Wrote: {OUT}")
