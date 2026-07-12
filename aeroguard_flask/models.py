"""SQLAlchemy models for AERO-GUARD.

Multi-tenant model — every operational record carries a ``provider_id``
foreign key. Routes must filter by the logged-in user's provider so
Provider A never sees Provider B's data. Auth lands in Section 3; for
now the seed data assigns sensible providers to every record so the
visual demo keeps working.
"""
from __future__ import annotations

from datetime import datetime

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()


# ---------------------------------------------------------------------------
# Tenancy + identity
# ---------------------------------------------------------------------------

class Provider(db.Model):
    """An AERO-GUARD provider company (the helpdesk / reseller)."""
    __tablename__ = "providers"

    id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    slug = db.Column(db.String(60), unique=True, nullable=False)
    country = db.Column(db.String(4), default="ZW")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    users = db.relationship("User", back_populates="provider", cascade="all, delete-orphan")
    agencies = db.relationship("Agency", back_populates="provider", cascade="all, delete-orphan")


class User(UserMixin, db.Model):
    """A login. Either a provider staff member or a consultant."""
    __tablename__ = "users"

    id = db.Column(db.String(20), primary_key=True)
    provider_id = db.Column(db.String(20), db.ForeignKey("providers.id"), nullable=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(160), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)
    role = db.Column(db.String(20), nullable=False)  # ADMIN | L2 | L1 | CONSULTANT
    active = db.Column(db.Boolean, default=True)
    mfa = db.Column(db.Boolean, default=False)
    last_login = db.Column(db.String(40), default="never")  # legacy display string
    last_login_at = db.Column(db.DateTime, nullable=True)    # Section 6: real timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Password reset (Section 3): token + expiry, no email send yet.
    reset_token = db.Column(db.String(64), nullable=True, index=True)
    reset_expires = db.Column(db.DateTime, nullable=True)

    provider = db.relationship("Provider", back_populates="users")

    # --- Password helpers ------------------------------------------------
    def set_password(self, raw: str) -> None:
        self.password_hash = generate_password_hash(raw)

    def check_password(self, raw: str) -> bool:
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, raw)

    # --- Flask-Login hooks ----------------------------------------------
    @property
    def is_active(self) -> bool:  # type: ignore[override]
        """Inactive users cannot log in (toggled via /provider/users)."""
        return bool(self.active)

    def is_provider_staff(self) -> bool:
        return self.role in {"ADMIN", "L2", "L1"}


# ---------------------------------------------------------------------------
# Operational entities
# ---------------------------------------------------------------------------

class Agency(db.Model):
    """A travel agency managed by a provider."""
    __tablename__ = "agencies"

    id = db.Column(db.String(20), primary_key=True)
    provider_id = db.Column(db.String(20), db.ForeignKey("providers.id"), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    pcc = db.Column(db.String(8), nullable=False)
    gds = db.Column(db.String(4), nullable=False)
    country = db.Column(db.String(4), nullable=False)
    seats = db.Column(db.Integer, default=10)
    used_seats = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default="PROVISIONING")
    month_adms = db.Column(db.Integer, default=0)
    last_active = db.Column(db.String(40), default="—")
    policy_level = db.Column(db.String(40), default="STANDARD")
    admin_email = db.Column(db.String(160), default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = db.Column(db.DateTime, nullable=True)  # soft delete

    provider = db.relationship("Provider", back_populates="agencies")


class Escalation(db.Model):
    __tablename__ = "escalations"

    id = db.Column(db.String(20), primary_key=True)
    provider_id = db.Column(db.String(20), db.ForeignKey("providers.id"), nullable=False, index=True)
    agency = db.Column(db.String(120))
    pnr = db.Column(db.String(20))
    subject = db.Column(db.String(255))
    level = db.Column(db.String(20), default="L1")
    priority = db.Column(db.String(10), default="MED")
    opened = db.Column(db.String(40), default="just now")
    status = db.Column(db.String(20), default="OPEN")
    sla = db.Column(db.String(40), default="24 hr left")  # legacy display string
    sla_due_at = db.Column(db.DateTime, nullable=True)    # Section 6: real deadline
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Thread(db.Model):
    """Client conversation thread shown on /provider/respond."""
    __tablename__ = "threads"

    id = db.Column(db.String(20), primary_key=True)
    provider_id = db.Column(db.String(20), db.ForeignKey("providers.id"), nullable=False, index=True)
    agency = db.Column(db.String(120))
    agent = db.Column(db.String(80))
    unread = db.Column(db.Integer, default=0)
    last = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = db.relationship(
        "Message",
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    thread_id = db.Column(db.String(20), db.ForeignKey("threads.id"), nullable=False, index=True)
    sender = db.Column(db.String(10), nullable=False)  # AGENT | OPS
    text = db.Column(db.Text, nullable=False)
    t = db.Column(db.String(20))  # human-readable timestamp shown in UI
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    thread = db.relationship("Thread", back_populates="messages")


# ---------------------------------------------------------------------------
# Knowledge / catalog entities (shared across providers for now)
# ---------------------------------------------------------------------------

class PolicyDoc(db.Model):
    __tablename__ = "policy_docs"

    id = db.Column(db.Integer, primary_key=True)
    cat = db.Column(db.String(20))
    name = db.Column(db.String(160))
    v = db.Column(db.String(20))


class LearningModule(db.Model):
    __tablename__ = "learning_modules"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160))
    progress = db.Column(db.Integer, default=0)
    badge = db.Column(db.String(40), default="Not started")


class Alert(db.Model):
    __tablename__ = "alerts"

    id = db.Column(db.String(20), primary_key=True)
    severity = db.Column(db.String(10))  # CRIT | WARN | INFO
    source = db.Column(db.String(40))
    title = db.Column(db.String(255))
    time = db.Column(db.String(20))
    ongoing = db.Column(db.Boolean, default=False)
    impacted_agencies = db.Column(db.Integer, default=0)


class PendingIssue(db.Model):
    __tablename__ = "pending_issues"

    id = db.Column(db.String(20), primary_key=True)
    agency = db.Column(db.String(120))
    type = db.Column(db.String(40))
    summary = db.Column(db.String(255))
    age = db.Column(db.String(20))
    priority = db.Column(db.String(10))


# ---------------------------------------------------------------------------
# Audit trail (writes from every state-changing route, Section 8)
# ---------------------------------------------------------------------------

class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    provider_id = db.Column(db.String(20), db.ForeignKey("providers.id"), index=True)
    actor_user_id = db.Column(db.String(20), db.ForeignKey("users.id"), nullable=True)
    action = db.Column(db.String(60), nullable=False)  # e.g. AGENCY_SUSPEND
    target_type = db.Column(db.String(40))  # e.g. agency, escalation
    target_id = db.Column(db.String(40))
    note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
