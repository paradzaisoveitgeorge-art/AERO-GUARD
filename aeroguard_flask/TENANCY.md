# AERO-GUARD — Multi-Tenancy Guide

This document covers the data isolation layer added in **Section 5** of
the MVP build. Section 3 answered "are you logged in?" Section 4
answered "are you allowed to do this?" Section 5 answers "are you
allowed to do this **to this specific record**?"

If you've never worked with multi-tenant systems before, start with
**§1 Plain-English overview**.

---

## 1. Plain-English overview

AERO-GUARD is a **multi-tenant SaaS**: one running app serves multiple
provider companies (today: AERO-GUARD HQ, SkyOps Africa, Horizon GDS
Partners). Each provider has its own agencies, escalations
and helpdesk staff. **None of them should ever see another provider's
data.**

Before Section 5, even though the database had a `provider_id`
column on every operational table, **nothing was actually checking
it**. Soviet (AERO-GUARD HQ admin) could type any agency ID into the
URL and read it — including a competitor's. Section 5 closes that.

Three rules now:

1. **Every list query is tenant-scoped.** If Soviet visits
   `/provider/agencies`, the SQL automatically adds
   `WHERE provider_id = 'PRV-AG'`. He never even loads other
   providers' rows.
2. **Every single-record lookup checks ownership.** If Soviet POSTs
   to `/provider/agencies/AG-1003/delete` (an agency that belongs to
   Horizon), the server returns **404 — not 403**. Why 404? So the
   error code looks the same as if the record didn't exist, denying
   an attacker the chance to probe which IDs exist in other tenants.
3. **Every action is audit-logged.** Who did what, when, against
   which record, in which tenant. The `audit_logs` table is now
   append-only history that survives even if the underlying record
   is deleted.

The topbar also shows a **TENANT** chip so it's always visually clear
which tenant context you're operating in. Useful when support
engineers switch between accounts during demos.

---

## 2. The three helpers

All tenancy logic flows through three short functions in `app.py`.
Memorise these — they are the bedrock of data isolation.

### `current_provider_id()`
Returns the logged-in user's `provider_id`. Returns `None` for
consultants (who have no provider) and anonymous requests.

### `tenant_q(Model)`
Returns `Model.query` pre-filtered to the current provider.

```python
# Before (vulnerable):
agencies = Agency.query.filter(Agency.deleted_at.is_(None)).all()

# After (safe):
agencies = tenant_q(Agency).filter(Agency.deleted_at.is_(None)).all()
```

Used in every list/search endpoint that touches a tenant-scoped table.

### `get_owned_or_404(Model, pk)`
Single-row lookup that fetches by primary key, then verifies
ownership. Raises 404 if either the row doesn't exist or it's in a
different tenant.

```python
# Before (vulnerable — anyone with the ID can delete):
a = Agency.query.get(agency_id)
if a:
    a.deleted_at = datetime.utcnow()

# After (safe — wrong tenant gets 404):
a = get_owned_or_404(Agency, agency_id)
a.deleted_at = datetime.utcnow()
```

Used in every mutating route that operates on a specific record.

---

## 3. Tenant-scoped vs catalog data

| Tenant-scoped (always filtered) | Catalog (shared) |
|---|---|
| `agencies` | `policy_docs` |
| `users` (except consultants) | `learning_modules` |
| `escalations` | `alerts` |
| `threads` + `messages` | `pending_issues` |
| `audit_logs` | |

> **Why are catalog tables shared?** They're reference material that
> looks the same for everyone (GDS terms of use, NCP rules). If a
> provider later needs custom alerts, add `provider_id` to the table
> + a migration — the helper functions don't need to change.

The dashboard "Pending Issues" tile is a hybrid: the rows live in the
shared catalog, but the dashboard filters them by agency name to only
show issues for agencies the current tenant owns.

---

## 4. Route-by-route audit

Every route below now enforces tenancy:

| Route | List/lookup pattern | Notes |
|---|---|---|
| `GET /provider` | `all_agencies()` (scoped), filtered `PendingIssue` | ADM counters computed from own data |
| `GET /provider/agencies` | `all_agencies()` | Filters + sort run on tenant data |
| `POST /provider/agencies/provision` | Writes with `provider_id=current` | Audit: `AGENCY_PROVISION` |
| `POST /provider/agencies/<id>/toggle-suspend` | `get_owned_or_404` | Audit: `AGENCY_TOGGLE_SUSPEND` |
| `POST /provider/agencies/<id>/delete` | `get_owned_or_404` | Soft delete + audit |
| `POST /provider/agencies/bulk` | `tenant_q(Agency).filter(id IN ...)` | Cross-tenant IDs silently ignored |
| `GET /provider/users` | `tenant_q(User)` | Excludes consultants |
| `POST /provider/users/invite` | Writes with `provider_id=current` | Global email uniqueness enforced |
| `POST /provider/users/<id>/toggle-active` | `get_owned_or_404` | Can't disable yourself |
| `POST /provider/users/<id>/remove` | `get_owned_or_404` | Can't remove yourself |
| `GET /provider/audits` | `all_agencies()` | Health/savings computed from own data |
| `GET /provider/escalations` | `tenant_q(Escalation)` | |
| `POST /provider/escalations/new` | Writes with `provider_id=current` | |
| `POST /provider/escalations/<id>/escalate` | `get_owned_or_404` | |
| `POST /provider/escalations/<id>/resolve` | `get_owned_or_404` | |
| `GET /provider/respond` | `tenant_q(Thread)` | |
| `POST /provider/respond/<id>/reply` | `get_owned_or_404` | |

The catalog routes (`/provider/policies`, `/provider/learning`,
`/provider/emulate`) don't touch tenant-scoped tables and so don't
need filtering.

---

## 5. Self-protection

A common edge case: an admin disables their own account, then can't
log back in to fix it. We block this:

- `POST /provider/users/<own_id>/toggle-active` → flashes "You can't
  disable your own account." and no-ops.
- `POST /provider/users/<own_id>/remove` → same treatment.

(Section 6 will add an "are you the **only** active admin?" guard so
the last admin can't be removed by a peer either.)

---

## 6. Audit log

Every mutating route now calls `write_audit(action, target_type,
target_id, note=...)`. Each row records:

| Column | Value |
|---|---|
| `provider_id` | The tenant the action belongs to |
| `actor_user_id` | Who performed it |
| `action` | e.g. `AGENCY_DELETE`, `USER_INVITE`, `ESCALATION_CREATE` |
| `target_type` | `agency` / `escalation` / `user` / `thread` |
| `target_id` | The PK of the affected row |
| `note` | Free text for context (amount, new status, etc.) |
| `created_at` | UTC timestamp |

Audit logs are **append-only** by convention — there's no UPDATE or
DELETE endpoint, and we'll add a DB trigger in Section 11 (hardening)
to enforce it at the storage layer.

The Section 8 work item will add a `/provider/audit-log` page that
renders these rows with filtering by user, action, and date.

---

## 7. Verifying cross-tenant isolation

The smoke tests below are what I ran after Section 5 landed. Repeat
them after any change that touches the data layer.

```bash
# Soviet (PRV-AG admin) should ONLY see his own data:
#   - Agencies AG-1001 (Skylink), AG-1004 (Continental Tours)
#   - Escalation ESC-7781

# Try to delete an agency that belongs to PRV-HZ:
curl -X POST -b cookies.txt http://localhost:5050/provider/agencies/AG-1003/delete \
     --data "csrf_token=$T"
# → 404 (not 403, not 200)

# Try to resolve an escalation that belongs to PRV-SKY:
curl -X POST -b cookies.txt http://localhost:5050/provider/escalations/ESC-7780/resolve \
     --data "csrf_token=$T"
# → 404

# Bulk-delete with a cross-tenant ID:
curl -X POST -b cookies.txt http://localhost:5050/provider/agencies/bulk \
     --data "csrf_token=$T&action=DELETE&ids=AG-1003"
# → 302 (the endpoint succeeds, but AG-1003 is silently filtered out
#        and remains untouched)

# Now log in as Kelvin (PRV-SKY L1) and confirm ESC-7780 is still OPEN:
curl -b kelvin.txt http://localhost:5050/provider/escalations
# → should still contain ESC-7780 with status="OPEN"
```

If any of those return a 200/302 success that **actually modifies**
cross-tenant data, that's a regression — fix immediately.

---

## 8. Why 404 not 403

When Soviet (PRV-AG) attempts to read or modify a record from PRV-HZ,
we return **404 Not Found**, not 403 Forbidden. This is intentional:

- 403 means "this exists but you can't have it" → leaks the existence
  of the record. An attacker can probe IDs and learn the ID space of
  other tenants.
- 404 means "no such record from your perspective" → identical to
  the response for a genuinely nonexistent ID. An attacker learns
  nothing.

We do still return 403 from the **role gate** in Section 4 (e.g. L1
hitting an ADMIN-only endpoint). That's about *role* not *tenancy*,
and the existence of the endpoint isn't a secret.

---

## 9. Limitations & next steps

- The catalog tables (`alerts`, `policy_docs`, etc.) are currently
  read-only for everyone. If you later add admin tools to manage them,
  add a `provider_id` column + scope.
- Email uniqueness is enforced **globally** across providers. If two
  customers happen to hire the same contractor, they can't both
  invite the same email. Acceptable for now; revisit if it becomes a
  pain.
- We assume `current_user.provider_id` is trustworthy — it's loaded
  by Flask-Login from the session cookie, which is signed. A
  successful attack on `SECRET_KEY` would defeat this; keep that
  secret rotated and never commit it.
- There's no row-level encryption. If a sysadmin gets the SQLite
  file, they can read everything. That's a future hardening step
  (envelope encryption per tenant) but not MVP material.

---

## 10. What's next (Section 6 preview)

**Workflow persistence** — making sure every state transition the UI
implies is actually saved correctly and survives a server restart.
Today the audit log writes are happening but a few rough edges
remain:

- "Last login" still says "now"/"2 hr ago" as static strings rather
  than computed from the DB timestamp.
- The seed script seeds `last_active` as `"3 min ago"` — fun for
  demos, fragile across days. Section 6 makes these dynamic.

After Section 6 the MVP can survive arbitrary restarts and still feel
"live." That unlocks Section 9 (deploy to Render).
