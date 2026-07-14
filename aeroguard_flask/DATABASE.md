# AERO-GUARD — Database Guide

This document covers the database layer added in **Section 2** of the MVP
build: what tables exist, why they look the way they do, and how to run
the everyday commands (migrate, seed, reset).

If you've never touched a database before, start with **§1 Plain-English
overview**. Engineers can jump to §3.

---

## 1. Plain-English overview

Until now, when you restarted the Flask server, every agency /
escalation you'd added would vanish — they only lived in Python memory.
Section 2 fixed that. We now save everything to a small database file
called `aeroguard.db`, sitting in the `instance/` folder next to the app.

A **database** is just a structured file with rows and columns, like
Excel — except organised by a tool (SQLAlchemy) that prevents data
corruption and lets us ask precise questions ("show me all SUSPENDED
agencies in Zimbabwe with more than 10 ADMs this month").

There are 3 ideas you need to know:

1. **Models** — Python classes in `models.py` that describe each table.
   Each class becomes a table, each attribute becomes a column.
2. **Migrations** — version control for the database. Whenever you
   change a model, you generate a "migration" file that knows how to
   update existing databases (locally and in production) to match.
3. **Seed data** — a known-good starting state for demos. One command
   (`flask seed`) wipes the DB and recreates 3 providers, 1 consultant,
   6 agencies, etc. You'll run this before every client pitch.

---

## 2. Daily commands

All commands run from inside `aeroguard_flask/` with the venv active.

| Command | What it does |
|---|---|
| `flask --app app db upgrade` | Apply any pending migrations (run after `git pull`). |
| `flask --app app seed` | Wipe the DB and load the standard demo state. |
| `flask --app app reset-demo` | Same as `seed` — alias, easier to remember before pitches. |
| `flask --app app db migrate -m "what changed"` | Create a new migration after editing `models.py`. |
| `python app.py` | Run the dev server on port 5050. |

> **Tip — on Windows PowerShell:** use `$env:FLASK_APP="app"` once per
> session, then drop the `--app app` from every command.

---

## 3. Schema

13 tables. Multi-tenant entities carry a `provider_id` foreign key so a
provider only ever sees its own data (enforced in Section 5).

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            tenancy + identity                           │
├──────────────────────────────────────────────────────────────────────────┤
│  providers  ──┬──→  users          (provider staff + consultants)       │
│               ├──→  agencies       (the travel agencies they manage)    │
│               ├──→  escalations                                         │
│               ├──→  threads ──→ messages                                │
│               └──→  audit_logs                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                       knowledge / catalog (shared)                      │
├──────────────────────────────────────────────────────────────────────────┤
│  policy_docs   learning_modules   alerts   pending_issues               │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Tenant-scoped tables

| Table | Purpose | Key columns |
|---|---|---|
| `providers` | The AERO-GUARD provider company (helpdesk / reseller). | `id`, `name`, `slug` |
| `users` | A login. Either provider staff or a travel agency consultant. | `id`, `provider_id` (nullable for consultants), `email`, `role` |
| `agencies` | Travel agencies managed by a provider. Soft-deletable via `deleted_at`. | `id`, `provider_id`, `status`, `month_adms` |
| `escalations` | Helpdesk tickets escalating between L1 → L2 → vendor. | `id`, `provider_id`, `level`, `priority` |
| `threads` + `messages` | Client conversations on `/provider/respond`. | `thread_id`, `sender`, `text` |
| `audit_logs` | Append-only "who did what" trail. Populated in Section 8. | `actor_user_id`, `action`, `target_id` |

### 3.2 Shared catalog tables

These don't (yet) belong to a specific provider — they're reference
material every provider sees the same way.

| Table | Purpose |
|---|---|
| `policy_docs` | GDS / NDC / OTA agreements visible on `/provider/policies`. |
| `learning_modules` | Onboarding courses on `/provider/learning`. |
| `alerts` | Cross-tenant system alerts shown on the dashboard. |
| `pending_issues` | "Stuff that needs your attention" tiles. |

If a future requirement is "Acme Provider has its own policies", we'll
add a `provider_id` column to those tables and a migration.

### 3.3 Roles

Stored as a string in `users.role`. Section 4 will enforce permissions.

| Role | Sees |
|---|---|
| `ADMIN` | Everything for their provider |
| `L2` | Above except provisioning |
| `L1` | View dashboards, respond to clients |
| `CONSULTANT` | Only `/` (the Smartpoint demo) |

---

## 4. How a model becomes a table

Every model class in `models.py` follows the same shape:

```python
class Agency(db.Model):
    __tablename__ = "agencies"

    id = db.Column(db.String(20), primary_key=True)
    provider_id = db.Column(db.String(20), db.ForeignKey("providers.id"), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    # ...
```

Three things to notice:

- `__tablename__` is the literal table name in the database.
- `primary_key=True` marks the unique identifier — every row must have one.
- `db.ForeignKey("providers.id")` says "this column references a real
  row in the `providers` table". This is what enforces tenancy: you
  can't have an orphan agency that points to a provider that doesn't
  exist.

---

## 5. Migrations workflow

Whenever you add/remove/change a column in `models.py`:

```bash
# 1. Generate a migration file (Alembic compares models → DB and writes a diff)
flask --app app db migrate -m "add deleted_at to agencies"

# 2. INSPECT the generated file in migrations/versions/ — sometimes Alembic
#    needs a hand (renamed columns, data migrations). Edit it if needed.

# 3. Apply the migration to your local DB
flask --app app db upgrade

# 4. Commit BOTH the model change AND the migration file
git add models.py migrations/versions/
git commit -m "agencies: add soft-delete column"
```

In production (Render), every deploy automatically runs `flask db
upgrade` as part of the start command (we'll add this in Section 10).
That's how production catches up to the new schema.

---

## 6. Where the data lives

- **Local dev**: SQLite file at `aeroguard_flask/instance/aeroguard.db`.
  Gitignored. Delete it any time to start over — `flask db upgrade && flask seed` rebuilds it.
- **Production**: Postgres URL in the `DATABASE_URL` env var. SQLAlchemy
  handles both the same way; we just point at a different connection
  string.

The code that picks one or the other is in `app.py`:

```python
db_url = os.environ.get("DATABASE_URL", _default_db)
if db_url.startswith("postgres://"):       # Render / Heroku quirk
    db_url = db_url.replace("postgres://", "postgresql://", 1)
```

---

## 6.1 Backups (production)

**Render `starter` plan and up**: Render Postgres takes an automatic
daily snapshot and keeps 7 days of history. Restore is one click in
the Render dashboard. Nothing to configure — comes with the plan.

**Render `free` plan**: no automatic backups (that's the trade-off
for $0). Two options if you're staying on free:

1. **Manual dump before big changes** — from the Render dashboard
   Shell for the `aero-guard-web` service, run:
   ```
   pg_dump $DATABASE_URL > /tmp/aeroguard-$(date +%F).sql
   ```
   then download the file. Do this before running any risky migration.

2. **External nightly cron** — set up a GitHub Actions workflow with
   a schedule trigger that dumps the DB and uploads to S3 / Backblaze
   B2 / a private repo. Runs on GitHub's runners, doesn't need any
   Render-side setup. Not written yet — flagged for P4 (exports).

**Manual restore** (any plan):
```
psql $DATABASE_URL < backup.sql
```

Restoring wipes existing data — make a fresh dump first if it matters.

---

## 7. Why we structure data this way (cheat sheet)

| Decision | Reason |
|---|---|
| Every operational table has `provider_id` | So Provider A can never see Provider B's rows. Cheap to add now, expensive later. |
| `agencies.deleted_at` instead of hard delete | A deleted agency may still have audit trail referring to it. Soft delete preserves history. |
| `users.email` is unique globally | Same human shouldn't have two logins. |
| `users.provider_id` is nullable | Travel agency consultants don't belong to a provider. |
| `audit_logs` is append-only | Tamper resistance — never UPDATE/DELETE, only INSERT. |
| Catalog tables (`alerts`, `policy_docs`) are not tenant-scoped (yet) | They're the same content for everyone in this MVP. Easy to scope later. |

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `sqlalchemy.exc.OperationalError: no such table: agencies` | You forgot to run `flask db upgrade` after pulling. |
| Page loads but lists are empty | DB exists but wasn't seeded — run `flask seed`. |
| `ERROR [alembic] Target database is not up to date` | Run `flask db upgrade`. If still stuck, delete `instance/aeroguard.db` and start over. |
| Migration was generated wrong | Delete the file in `migrations/versions/` (only if not committed), fix `models.py`, re-run `flask db migrate`. |
| Demo data drifted after a long pitch session | Run `flask reset-demo` to snap back. |

---

## 9. What's next (Section 3 preview)

Section 3 adds **authentication**: real passwords on the `users` table,
a login page, and the `@require_role` decorator that locks each route
to the right audience. The schema in this section already has
`password_hash` and `role` columns ready — we just won't populate them
until then.
