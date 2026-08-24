"""Role + permission model for AERO-GUARD.

We have four roles in the system (stored in ``users.role``):

    ADMIN       Provider admin — full control of their tenancy
    L2          Senior helpdesk — operational power except provisioning
    L1          Junior helpdesk — read + light actions
    CONSULTANT  Travel agency consultant — only sees /

Authorisation is **action-based**: code asks ``can(user, 'agency:delete')``
rather than ``user.role == 'ADMIN'``. That way the matrix below is the
single place we change when permissions evolve.
"""
from __future__ import annotations

from functools import wraps

from flask import abort, render_template
from flask_login import current_user


# Role constants — import these instead of hard-coding strings.
ADMIN = "ADMIN"
L2 = "L2"
L1 = "L1"
CONSULTANT = "CONSULTANT"
AGENCY_ADMIN = "AGENCY_ADMIN"    # agency-portal owner (max 3 sub-users)
AGENCY_USER = "AGENCY_USER"      # agency-portal sub-user

PROVIDER_ROLES = {ADMIN, L2, L1}
AGENCY_ROLES = {AGENCY_ADMIN, AGENCY_USER}
ALL_ROLES = PROVIDER_ROLES | {CONSULTANT} | AGENCY_ROLES


# Permission matrix — single source of truth.
# Keys are action names (namespaced: "entity:verb"). Values are the
# set of roles that may perform them.
PERMISSIONS: dict[str, set[str]] = {
    # Agencies
    "agency:view":        PROVIDER_ROLES,
    "agency:provision":   {ADMIN},
    "agency:suspend":     {ADMIN, L2},
    "agency:delete":      {ADMIN},
    "agency:bulk_delete": {ADMIN},
    "agency:bulk_other":  {ADMIN, L2},

    # Helpdesk users
    "user:view":           PROVIDER_ROLES,
    "user:invite":         {ADMIN},
    "user:toggle_active":  {ADMIN},
    "user:remove":         {ADMIN},
    "user:reset_password": {ADMIN},
    "user:reset_mfa":      {ADMIN},

    # Escalations
    "escalation:view":      PROVIDER_ROLES,
    "escalation:create":    PROVIDER_ROLES,
    "escalation:to_l2":     PROVIDER_ROLES,
    "escalation:to_vendor": {ADMIN, L2},
    "escalation:resolve":   {ADMIN, L2},

    # Threads (respond)
    "thread:view":  PROVIDER_ROLES,
    "thread:reply": PROVIDER_ROLES,

    # Audits
    "audit:view": PROVIDER_ROLES,

    # Tools
    "emulate:use": {ADMIN, L2},
    "policy:view": PROVIDER_ROLES,
    "learning:view": PROVIDER_ROLES,
}


def can(user, action: str) -> bool:
    """Return True if ``user`` may perform ``action``."""
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if not user.active:
        return False
    allowed = PERMISSIONS.get(action, set())
    return user.role in allowed


def require(action: str):
    """Decorator: only allow the route if ``current_user`` may ``action``."""
    def deco(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            if not can(current_user, action):
                # Render the friendly 403 page rather than the raw abort
                # screen — same template the consultant guard uses.
                return render_template("auth/403.html"), 403
            return view(*args, **kwargs)
        return wrapped
    return deco


def require_role(*roles: str):
    """Decorator: only allow the route if ``current_user`` has one of ``roles``."""
    allowed = set(roles)

    def deco(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            if (not current_user.is_authenticated
                    or not current_user.active
                    or current_user.role not in allowed):
                return render_template("auth/403.html"), 403
            return view(*args, **kwargs)
        return wrapped
    return deco
