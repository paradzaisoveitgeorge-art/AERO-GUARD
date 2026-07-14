# Deploying AERO-GUARD to Render.com

The prototype is set up for one-click Blueprint deploys on
[Render.com](https://render.com). This walks you through going from a
GitHub repo to a live URL in about five minutes.

> **Cost**: everything below runs on Render's free tier. The web
> service spins down after 15 min of inactivity (~30s cold-start on
> the next request), and the free Postgres expires after 90 days. Bump
> both to `starter` ($7/mo each = $14/mo) for zero cold starts, daily
> backups, and custom domains.

---

## 1. Create the Render account

1. Go to <https://render.com> and sign in with GitHub.
2. Grant Render read access to the `aero-guard-prototype` repo (you
   can limit it to just this repo — no need for all your repos).

## 2. Trigger the Blueprint deploy

Render already knows how to deploy this app because
[`render.yaml`](../render.yaml) at the repo root describes the
whole stack.

1. In the Render dashboard, click **New** → **Blueprint**.
2. Select the `aero-guard-prototype` repo.
3. Render reads `render.yaml`, previews what it will create
   (`aero-guard-db` Postgres + `aero-guard-web` service), and asks
   you to confirm.
4. Click **Apply**.

Render now:

- Provisions a managed Postgres database (`aero-guard-db`)
- Builds the Flask app: `pip install -r requirements.txt && flask db upgrade`
- Injects `DATABASE_URL` from the DB into the web service
- Generates a fresh `SECRET_KEY` for you (never checked into git)
- Starts gunicorn on the public URL Render assigns you
  (e.g. `aero-guard-web.onrender.com`)

First build takes ~3–5 minutes. Watch the log in the Render dashboard.

## 3. Seed the initial demo data

The build ran `flask db upgrade` so the schema is in place, but no
users exist yet. In the Render dashboard:

1. Open the **aero-guard-web** service.
2. Go to **Shell** (top-right).
3. Run: `flask seed`

That creates the standard demo tenants + a login for
`soviet@aero-guard.io` / `aeroguard` (see [`AUTH.md`](AUTH.md) for the
full account list).

> **Change the seeded passwords in production.** The demo password
> `aeroguard` is fine while you're pitching to the client, but rotate
> every seed user's password (or `flask reset-demo` and then edit
> `seed.py`) before you hand any real credentials to a real client.

## 4. Log in and verify

Open `https://aero-guard-web.onrender.com/login` and sign in as the
admin. If you see the dashboard, you're live.

Health-check the app externally:

```bash
curl -s https://aero-guard-web.onrender.com/healthz
# → {"status":"ok"}
```

## 5. Wire a custom domain (optional)

Requires a Render `starter` plan ($7/mo per service).

1. In the web service settings, **Custom Domains** → **Add**.
2. Enter your domain (e.g. `app.aero-guard.io`).
3. Render shows a CNAME to add at your DNS provider. Add it.
4. Once DNS propagates (usually <5 min), Render provisions a
   Let's Encrypt cert automatically.

## 6. Auto-deploy from GitHub

`render.yaml` has `autoDeploy: true`, so every push to `main` triggers
a fresh deploy. The GitHub Actions CI (`.github/workflows/ci.yml`)
runs first — if the smoke test fails, the deploy still happens on
Render (Render is independent), but you'll see the red CI badge and
know to fix it fast.

If you want Render to only deploy after CI passes, disable
`autoDeploy` here and use the Render **Deploy Hook** URL from a
GitHub Action step instead.

---

## Common issues

- **Build fails on `flask db upgrade`** — usually a missing env var.
  Check that `FLASK_APP=app` is set (it should be, from `render.yaml`).
- **Cold starts feel slow** — expected on the free tier. Upgrade
  the web service to `starter` to keep it warm.
- **Postgres expired at 90 days** — Render sends warning emails. Bump
  the DB plan to `starter` before it expires, or dump-and-restore into
  a fresh instance.
- **`SECRET_KEY` gone missing** — Render generated one on the first
  Blueprint apply. If you deleted the env var, existing sessions
  break (users log out). Just set a new one.

For the DB schema and daily commands, see [`DATABASE.md`](DATABASE.md).
For local dev, see [`README.md`](README.md).
