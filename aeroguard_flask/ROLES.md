# AERO-GUARD — Roles & Permissions Guide

This document covers the authorisation layer added in **Section 4** of
the MVP build. Section 3 answered "are you logged in?" Section 4
answers "are you allowed to do this?"

If you've never worked with role-based access control before, start
with **§1 Plain-English overview**.

---

## 1. Plain-English overview

A logged-in user can see the app — but not every user should be able
to do everything. A junior helpdesk agent shouldn't be able to delete
a customer, hand themselves admin rights, or wire money. Section 4
gives every action in the app a "ticket" that says which role can use
it.

Three rules:

1. **Buttons disappear** for users who can't use them. (No point in
   teasing.) Locked-out actions show a dim "🔒" chip so it's clear
   the feature exists but isn't available to you.
2. **The server checks again.** Even if you sneak past the UI by
   hand-crafting a request, the backend re-validates. A junior posting
   directly to `/provider/agencies/AG-1001/delete` gets a **403**.
3. **The permission matrix lives in one place** — `permissions.py`.
   To change who can do what, you edit one Python dictionary, not
   twenty templates.

---

## 2. The four roles

| Role | Who | Typical scope |
|---|---|---|
| **ADMIN** | Provider admins (Soviet, Tariro) | Full control over their provider. Provisioning, billing-like actions, user lifecycle. |
| **L2** | Senior helpdesk | Operational power — suspend agencies, escalate to vendors, resolve cases, emulate PCC. No provisioning, no user lifecycle. |
| **L1** | Junior helpdesk | Read-only on most things. Can reply to clients, create escalations, issue *small* vouchers. |
| **CONSULTANT** | Travel agents using AERO-GUARD inside Smartpoint | Only sees `/` (the consultant terminal). 403 on anything under `/provider/*`. |

---

## 3. Permission matrix

The single source of truth lives in `permissions.py`. Reproduced here
for reference — when the file changes, this table goes stale, so
treat the code as authoritative.

Legend: ✅ allowed · ❌ blocked

| Action | ADMIN | L2 | L1 |
|---|:---:|:---:|:---:|
| View dashboard / lists | ✅ | ✅ | ✅ |
| **Provision agency** | ✅ | ❌ | ❌ |
| Suspend / reactivate agency | ✅ | ✅ | ❌ |
| **Delete agency** | ✅ | ❌ | ❌ |
| Bulk suspend / reactivate | ✅ | ✅ | ❌ |
| **Bulk delete** | ✅ | ❌ | ❌ |
| **Invite helpdesk user** | ✅ | ❌ | ❌ |
| Enable / disable user | ✅ | ❌ | ❌ |
| **Remove user** | ✅ | ❌ | ❌ |
| Issue voucher (any amount) | ✅ | ✅ | ✅* |
| Export vouchers CSV | ✅ | ✅ | ❌ |
| Create escalation | ✅ | ✅ | ✅ |
| Escalate to L2 | ✅ | ✅ | ✅ |
| **Escalate to vendor** | ✅ | ✅ | ❌ |
| **Resolve escalation** | ✅ | ✅ | ❌ |
| Reply to client thread | ✅ | ✅ | ✅ |
| **Emulate PCC** | ✅ | ✅ | ❌ |

> *L1 voucher cap: **$500** (defined as `L1_VOUCHER_CAP` in
> `permissions.py`). A voucher over the cap submitted by L1 is
> rejected with 403 and a banner explains why. Above-cap requests need
> L2 or ADMIN to issue.

---

## 4. How a route gets gated

Three patterns, depending on whether the rule is static or depends on
data.

### a) Pure role check — `@require(action)` decorator

```python
@app.route("/provider/agencies/provision", methods=["POST"])
@require("agency:provision")
def provision_agency():
    ...
```

If `current_user` may perform `agency:provision`, the view runs. Else
the friendly 403 page renders.

### b) Data-dependent — call `can(...)` inline

Used when the answer depends on the request body, like the L1 voucher
cap:

```python
@app.route("/provider/vouchers/issue", methods=["POST"])
def issue_voucher():
    amount = float(request.form.get("amount") or 0)
    if not can(current_user, "voucher:issue", amount=amount):
        return render_template("auth/403.html"), 403
    # ... write voucher
```

### c) Hide UI before they click — `can(...)` in templates

`can()` is exposed as a global in every Jinja template (via the
`inject_user` context processor):

```jinja
{% if can('agency:delete') %}
  <form method="post" action="...">
    <button>Delete</button>
  </form>
{% endif %}
```

For the "Provision Agency" button on the agencies page we go a step
further — instead of hiding it, we show a dim "🔒" chip so it's
obvious there *is* a feature, just not for this user.

---

## 5. Adding a new action

Suppose marketing asks for a "send promo email" feature, only for
ADMIN.

1. Add to `PERMISSIONS` in `permissions.py`:
   ```python
   "promo:send": {ADMIN},
   ```
2. Gate the POST route:
   ```python
   @app.route("/provider/promo/send", methods=["POST"])
   @require("promo:send")
   def send_promo():
       ...
   ```
3. Gate the button in the template:
   ```jinja
   {% if can('promo:send') %}<button>Send promo</button>{% endif %}
   ```

That's it. Three lines in three files.

## 6. Adding a new role

Say you want a "BILLING" role that can do voucher-related things plus
view audits but nothing else.

1. Add a constant near the top of `permissions.py`:
   ```python
   BILLING = "BILLING"
   PROVIDER_ROLES = {ADMIN, L2, L1, BILLING}
   ```
2. Add `BILLING` to the appropriate cells in `PERMISSIONS`.
3. Seed at least one user with `role="BILLING"` in `seed.py`.

The 403 page, the topnav, and the gates pick it up automatically.

---

## 7. Why this design (cheat sheet)

| Decision | Reason |
|---|---|
| Action names like `agency:delete` not bare booleans | Future-proof. We can later have `agency:delete:own` vs `agency:delete:any` without renaming everything. |
| Permission matrix in **one** dictionary | Auditing "who can do what" is a single file read. No grep across templates. |
| **Server re-validates** even after UI hides a button | UI is for usability, not security. Anyone with curl can post to `/provider/agencies/.../delete`; only the server check blocks it. |
| L1 voucher cap encoded in `can()`, not the route | Same logic available to the template — we can show the cap warning in the form *before* L1 tries to submit. |
| Friendly 403 template, not raw Flask abort screen | Consistent brand experience, plus an easy back-link. |
| `CONSULTANT` role can't see `/provider/*` at all | Defence in depth — the section-3 guard catches them before any per-action permission check runs. |

---

## 8. Testing your changes

```bash
# 1. Log in as each role in the browser and verify buttons appear / hide.
#    Demo passwords: aeroguard
#
# 2. From a different shell, hand-craft a POST to a gated action while
#    logged in as a lower role. You should see "403 Access denied" —
#    not a success page.
#
# 3. Add a test for new actions: spin up curl, log in, POST, assert 403.
```

We don't have a pytest suite yet (it's in the post-MVP backlog), but
the smoke test in §10 of `AUTH.md` plus the matrix above is the
checklist for now.

---

## 9. What's still missing (Section 5 preview)

Right now, **ADMIN at Provider A can still see Provider B's data** if
they guess an agency ID in the URL. Section 5 fixes that —
multi-tenancy enforcement. Every query gets filtered by
`current_user.provider_id`, and every record lookup verifies
ownership before returning.

That's the last "obvious gap" before the MVP can be safely demoed to
multiple prospects at once.
