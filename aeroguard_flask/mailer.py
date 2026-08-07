"""Tiny SMTP helper used by the auth email flows.

Configuration (all optional — read from environment):

    MAIL_SMTP_HOST     hostname of the SMTP relay
    MAIL_SMTP_PORT     port; defaults to 587
    MAIL_SMTP_USER     auth username
    MAIL_SMTP_PASSWORD auth password
    MAIL_SMTP_TLS      "1" (default) to STARTTLS, "0" to send plaintext
    MAIL_FROM          From: header; defaults to no-reply@aero-guard.io

When MAIL_SMTP_HOST isn't set the email is logged to the Flask logger
and the function returns False. That keeps local dev and the demo
working without a real relay while still letting callers vary the UX
(e.g. show the reset link on-screen only when we didn't actually send
an email).
"""
from __future__ import annotations

import logging
import os
import smtplib
from email.message import EmailMessage

log = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(os.environ.get("MAIL_SMTP_HOST"))


def send_email(*, to: str, subject: str, text: str, html: str | None = None) -> bool:
    """Send an email. Returns True on delivery, False if unconfigured or on error.

    Errors are logged, not raised — a failed email must never crash the
    request that triggered it. Callers who care about outcome should
    branch on the return value.
    """
    sender = os.environ.get("MAIL_FROM", "no-reply@aero-guard.io")

    if not is_configured():
        log.info(
            "[mailer] MAIL_SMTP_HOST unset — would have emailed %s\n"
            "        subject: %s\n%s",
            to, subject, text,
        )
        return False

    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")

    host = os.environ["MAIL_SMTP_HOST"]
    port = int(os.environ.get("MAIL_SMTP_PORT", "587"))
    user = os.environ.get("MAIL_SMTP_USER")
    password = os.environ.get("MAIL_SMTP_PASSWORD")
    use_tls = os.environ.get("MAIL_SMTP_TLS", "1") == "1"

    try:
        with smtplib.SMTP(host, port, timeout=10) as smtp:
            smtp.ehlo()
            if use_tls:
                smtp.starttls()
                smtp.ehlo()
            if user:
                smtp.login(user, password or "")
            smtp.send_message(msg)
        log.info("[mailer] sent %r to %s", subject, to)
        return True
    except Exception:  # noqa: BLE001
        log.exception("[mailer] failed to send %r to %s", subject, to)
        return False
