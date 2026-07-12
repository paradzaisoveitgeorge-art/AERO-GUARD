# AERO-GUARD — Authentication Guide

This document covers the auth layer added in **Section 3** of the MVP
build: how login works, where sessions live, what's locked down, what
demo accounts exist, and what's still deferred.

If you've never touched auth before, start with **§1 Plain-English
overview**. Engineers can jump to §3.

---

## 1. Plain-English overview

Until Section 3, anybody who hit the AERO-GUARD URL could see
everything. Section 3 puts a **front door** on the app:

1. Visit the app → if you're not signed in, you get redirected to a
   **login page**.
2. Type your email + password. Right credentials? You're in. Wrong
   credentials? "Invalid email or password" and try again.
3. Once signed in, the app remembers you (in a **session cookie**)
   until you click **Sign out** or close your browser. If you tick
   "Remember me", the cookie sticks for 30 days.
4. Forgotten your password? Click "Forgot password?" → we generate a
   one-shot **reset link** (good for 2 hours) and display it on screen.
   In the real product this gets emailed; for the demo it's shown
   inline so you can finish the flow without an SMTP server.
5. Different people see different things. A **provider admin** lands on
   the dashboard. A **consultant** lands on the Smartpoint terminal and
   gets a "403 access denied" if they try to sneak into `/provider/*`.

Think of it as the difference between an office lobby (anyone walks
in) and a building with a swipe-card on every door (you swipe once,
the system tracks where you can go).

---

## 2. Demo accounts

All seeded users share the same demo password — easy to memorize at
pitches, easy to change later.

| Role | Email | Password | What they see |
|---|---|---|---|
| Provider Admin | `soviet@aero-guard.io` | `aeroguard` | Full provider console — manage agencies, users, vouchers, audits. |
| Provider L2 | `tariro@aero-guard.io` | `aeroguard` | Same console (role enforcement = Section 4). |
| Provider L1 | `kelvin@skyops.africa` | `aeroguard` | Same console. |
| Provider L1 (inactive) | `amina@horizon.partners` | `aeroguard` | **Cannot log in** — account disabled. Used to demo the disable/enable flow. |
| Consultant | `patrick@skylink.zw` | `aeroguard` | Smartpoint terminal only — gets 403 on `/provider/*`. |

> The login page lists these credentials in a small panel at the
> bottom so prospects can self-explore. Remove this panel before going
> live to real customers (see §7).

---

## 3. URL map

| Path | Method | Public? | Purpose |
|---|---|---|---|
| `/login` | GET / POST | ✅ public | Login form. POST authenticates. |
| `/logout` | POST | 🔒 logged in | Clears session + remember cookie. |
| `/forgot` | GET / POST | ✅ public | Generates a reset token, shows the link on screen. |
| `/reset/<token>` | GET / POST | ✅ public | Set a new password using a valid token (2hr lifetime). |
| `/healthz` | GET | ✅ public | `{"status":"ok"}` — health check for hosts. |
| `/` | GET | 🔒 consultant | Smartpoint terminal. Provider users get redirected to `/provider`. |
| `/provider/*` | * | 🔒 provider staff | Console. Consultants get 403. |
| Everything else under `/static` | GET | ✅ public | CSS, JS, images. |

The "who can see what" gate is enforced in `app.py` by a single
`@app.before_request` hook — there is no per-route `@login_required`
to forget. To add a new public route, add its endpoint name to
`PUBLIC_ENDPOINTS`.

---

## 4. How a password is stored

Never in plaintext. When `seed.py` (or the invite-user form) calls
`user.set_password("aeroguard")`, the model:

1. Generates a random per-user salt.
2. Runs PBKDF2-SHA-256 with hundreds of thousands of iterations.
3. Stores `pbkdf2:sha256:<iterations>$<salt>$<hash>` in
   `users.password_hash` — a string from which the original password
   cannot be recovered.

Login checks call `check_password(raw)` which performs the same
hash + constant-time compare. So even if the SQLite file leaks,
nobody can read the passwords out of it.

We use Werkzeug's built-in `generate_password_hash` /
`check_password_hash` (industry-standard PBKDF2). When this graduates
beyond MVP, swap in `argon2-cffi` for the same API.

---

## 5. Sessions, cookies, and "Remember me"

| Cookie | Lifetime | Purpose |
|---|---|---|
| `session` | 12 hours (or until browser closes) | Holds the logged-in user ID, signed with `SECRET_KEY`. |
| `remember_token` | 30 days | Only set if "Remember me" was ticked. Re-establishes the session after the browser closes. |

Both cookies are configured:

- `HttpOnly` → JavaScript on the page cannot read them. Defends
  against XSS-stealing-the-session.
- `SameSite=Lax` → other sites cannot post forms to AERO-GUARD on
  your behalf and have your cookie ride along. Defends against CSRF.
- `Secure` → only set in production (when `FLASK_ENV=production`),
  so the cookie is never transmitted over plain HTTP. Disabled in
  development so login works on `http://localhost`.

Sessions are signed (not encrypted). The user ID inside is readable
if you base64-decode the cookie, but tampering would break the
signature and Flask-Login would reject it.

---

## 6. CSRF and rate limiting

### CSRF (Cross-Site Request Forgery)
Every POST in the app must include a `csrf_token` form field. The
token is bound to your session. Without it, the request is rejected
with **400 Bad Request**. This means a malicious site cannot trick
your browser into POSTing to AERO-GUARD while you happen to be
logged in.

In templates: `<input type="hidden" name="csrf_token" value="{{ csrf_token() }}" />`
inside every form. Already done on every form in the app.

### Rate limiting
The login route is capped at **5 attempts per minute per IP** by
Flask-Limiter. The 6th attempt returns **429 Too Many Requests**. The
forgot-password route is capped at 3/min. This slows brute-force
attacks without locking out legitimate users.

> **Limitation**: in development the limiter uses an in-memory store
> that resets when the server restarts. In production, point it at
> Redis via the `RATELIMIT_STORAGE_URI` env var. (Render + Upstash
> Redis is the cheapest pairing.)

---

## 7. Going to production — checklist

When you're ready to remove the training wheels:

- [ ] **Remove the demo-credentials panel** from
      `templates/auth/login.html` (the `.demo-creds` block at the bottom).
- [ ] **Set `FLASK_ENV=production`** on Render. This flips
      `SESSION_COOKIE_SECURE` to true and requires HTTPS.
- [ ] **Set a real `SECRET_KEY`** as a Render env var — at least 32
      random bytes. The app refuses to start in production without
      one.
- [ ] **Configure Redis for the rate limiter** (`RATELIMIT_STORAGE_URI`).
- [ ] **Hook up SMTP** so `forgot()` actually emails the reset link
      instead of showing it on screen. Postmark, Sendgrid, or SES all
      take ~20 mins. Replace the `reset_link` template rendering with
      a `send_mail(...)` call.
- [ ] **Rotate seeded passwords** — `flask reset-demo` is for the
      demo only. Real customers register or get invited.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Login page just refreshes, no error visible | CSRF token missing or expired | Refresh the page to get a new token, then submit. |
| "Invalid email or password" but you're sure | Account may be `active=False` | Toggle via `/provider/users` (logged in as admin). |
| Stuck in a redirect loop | `next` query param pointing back at `/login` | Clear cookies for the site and try again. |
| `429 Too Many Requests` on login | Hit rate limit | Wait 60 seconds. In production, increase the limit only after investigating *why* you're getting flooded. |
| Provider can't see the smartpoint at `/` | Intentional — provider users get bounced to `/provider`. Sign in as the consultant account to see it. |
| Consultant gets 403 on `/provider` | Intentional — consultants don't have console access. |
| `RuntimeError: SECRET_KEY env var is required` | Trying to run with `FLASK_ENV=production` without setting `SECRET_KEY` | Set the env var on the host. |

---

## 9. What's next (Section 4 preview)

Section 4 adds **role-based permission enforcement**. Today, any
provider staff user (ADMIN / L2 / L1) can see and do everything in
the console. Section 4 will:

- Add a `@require_role(...)` decorator
- Hide nav items the current user can't access
- Block destructive actions (delete agency, remove user) below admin
- Surface a friendlier "you don't have permission to do this" message
  instead of a raw 403

Section 5 then adds **multi-tenancy enforcement** — Provider A's
admin can no longer fetch Provider B's data by guessing IDs in the URL.
