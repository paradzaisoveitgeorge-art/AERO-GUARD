# AERO-GUARD

Welcome. This document is written for you (the client) as a **non-technical walkthrough** of the project. It explains what AERO-GUARD is, what's inside this repository, how to see it running, and where to go if you want to make changes or hand it to another developer down the line.

If any term below is unfamiliar, don't worry — it's explained in plain language, and there is a **Glossary** at the bottom of this page.

---

## 1. What AERO-GUARD is, in plain language

AERO-GUARD is a **compliance and revenue-protection tool for travel agencies**. Travel agencies book flights through big airline reservation systems (Galileo, Amadeus, Sabre — collectively called "GDS" systems). When a booking breaks an airline's rules, the airline later sends the agency a fine, called an **ADM (Agency Debit Memo)**. Those fines can add up to thousands of dollars per month per agency.

AERO-GUARD watches bookings as consultants create them, warns them **before** a fine can be issued, and offers a one-click fix. It also gives your helpdesk team a dashboard to manage all the agencies you sell it to.

The product has **two sides**, and this project builds both of them:

| Side | Who uses it | What they see |
|---|---|---|
| **Consultant view** | A travel-agency employee booking flights | A simulated booking terminal with an AERO-GUARD "smart button" that pops up warnings and fixes |
| **Provider console** | Your helpdesk / admin staff | A dark-themed dashboard for managing agencies, users, audits, support tickets, and more |

You can switch between them from links inside the app.

---

## 2. What is in this repository

Think of this repository (the folder on GitHub) as **the complete source code and instructions to run AERO-GUARD**. Everything a developer needs to launch or modify the app is here.

The important pieces:

- **`aeroguard_flask/`** — the actual working application. This is what runs on your server and what your users open in a browser.
- **`aero-guard/`, `aero_guard/`, `lovable_source/`** — earlier prototype versions kept for reference (an early React version and the original design export). You don't need to touch these; they're archived history.
- **`render.yaml`** — a recipe file that tells the hosting service (Render.com) how to put AERO-GUARD online. See section 4.
- **`.github/`** — automation that runs quality checks every time code is changed.
- **Documentation files** (`AERO-GUARD_Progress_Report.pdf`, `AERO_GUARD_Prototype_Tech_Stack.pdf`, `BUILD_PLAN.md`) — background documents produced during the build.

The **most complete technical documentation** lives inside `aeroguard_flask/` as several `.md` files (see section 6). Any developer picking this project up should start with `aeroguard_flask/README.md`.

---

## 3. Seeing it running (the fastest option)

If the project has been deployed to a live URL, you should be able to open it in any web browser — no installation needed. Ask your developer for the URL; it will look something like:

```
https://aero-guard-web.onrender.com
```

Once you open it:

- Go to **`/login`** at the end of the URL to sign in.
- Use one of the demo accounts listed in `aeroguard_flask/AUTH.md`. The standard admin account is:
  - **Email:** `soviet@aero-guard.io`
  - **Password:** `aeroguard`
- After logging in, the **Provider Console** appears. Use the **"← Consultant view"** link at the bottom of the left sidebar to jump to the Smartpoint (consultant) demo, and **"Provider Console →"** in the Smartpoint menu bar to come back.

> **Important:** the demo password (`aeroguard`) is fine for showing the product internally, but it must be changed before real users receive real accounts. Your developer can do this in a few minutes.

---

## 4. Putting the project online (if it isn't already)

The app is set up to deploy to **Render.com**, a hosting service that runs applications for you. The one-time setup takes about five minutes and costs **$0 on the free plan** (with the small trade-offs described below). Detailed step-by-step instructions live in `aeroguard_flask/DEPLOY.md` — the summary is:

1. Sign in to <https://render.com> with the GitHub account that owns this repository.
2. Click **New → Blueprint** and select this repository.
3. Render reads `render.yaml`, previews what it will create, and asks you to confirm — click **Apply**.
4. Wait ~5 minutes while Render builds the app and gives you a public URL.
5. Open Render's **Shell** for the web service and run `flask seed` once — this creates the demo login accounts.
6. Open the URL, go to `/login`, and sign in.

**Free-plan trade-offs** (worth knowing before you demo to anyone):

- The app **goes to sleep after 15 minutes** of inactivity. The next visitor has to wait ~30 seconds for it to wake up. Upgrading to the "Starter" plan ($7/month) removes this.
- The free database **expires after 90 days**. Render sends warning emails. Upgrading to the "Starter" database plan ($7/month) removes this.

Total to keep it fully live 24/7 with backups: **$14/month**.

---

## 5. Making changes to the app

You don't need to write code — but you should know **how changes happen** so you can direct a developer:

1. A developer edits files inside `aeroguard_flask/` on their computer.
2. They save those changes to GitHub (this is called a "push" or a "commit").
3. Render notices the change automatically and rebuilds the live app within a few minutes.

That's it. There is no manual "upload the site" step; it's all automatic once the code is on GitHub.

If you want the changes reviewed **before** they go live, ask your developer to use **pull requests** (a GitHub feature that lets someone else approve the change first). Every meaningful change in this project has already been done this way — you can see the history under the **"Pull requests"** tab on GitHub.

**Common change requests** you might make and roughly what's involved:

| You want to change… | Difficulty | Where it lives |
|---|---|---|
| Wording on a button or page label | Small | `aeroguard_flask/templates/` |
| Colors, fonts, or general look | Small–medium | `aeroguard_flask/static/css/` |
| Add a new admin page | Medium | Same folders, plus `app.py` |
| Connect a real airline system (Galileo/Amadeus/Sabre) | Large | New work — not currently built (see section 7) |
| Turn the passport scanner into a real OCR engine | Large | New work — currently simulated |

---

## 6. Deeper documentation for developers

If you (or a future developer) need more detail than this document, everything technical is inside the `aeroguard_flask/` folder as short, focused Markdown files:

- **`README.md`** — how to run the app on a developer's laptop, and the project layout
- **`DEPLOY.md`** — the full Render.com deploy walkthrough
- **`AUTH.md`** — how login works, demo accounts, password reset
- **`DATABASE.md`** — the database schema and daily commands
- **`ROLES.md`** — who can do what (admin, helpdesk, consultant, etc.)
- **`TENANCY.md`** — how multiple agencies are separated inside one shared system
- **`PERSISTENCE.md`** — how data is stored and backed up
- **`LIVENESS.md`** — the simulated live event stream

These are safe to open in any text editor or directly on GitHub.

---

## 7. What is NOT built yet (known gaps)

For full transparency, this is a **prototype**. Some parts of the finished product simulate real behavior rather than doing it for real. When you decide to move from prototype to production, these are the pieces that will need real work:

- **Real GDS connection.** The Smartpoint terminal is a visual simulation; it doesn't actually talk to Galileo/Amadeus/Sabre yet. That requires a paid integration agreement with the GDS provider (Travelport TSAPI or equivalent).
- **Real passport OCR.** The passport-scanning tab shows the full flow but always returns the same sample passport — a real OCR engine (Tesseract, AWS Textract, or similar) needs to be plugged in.
- **Tutorial videos.** The "Learn" tab has placeholders — the videos themselves aren't included.
- **Production email sending.** Password-reset emails currently work through any SMTP mail provider (Gmail, SendGrid, Mailgun, etc.) once you plug the credentials into Render — see the `MAIL_SMTP_*` variables in `render.yaml`.

None of these gaps block a demo or a client walkthrough — they are next-phase work.

---

## 8. Contact & handover

This repository was built by **Curtis Kasukusa** (`curtislyk` on GitHub). If you bring in another developer at any point, everything they need is inside this repository — start them on `aeroguard_flask/README.md` and they should be productive on day one.

For questions during the handover period, the fastest path is to:

1. Open an **Issue** on this GitHub repository (Issues tab at the top). It creates a written record we can both refer back to.
2. Or reach Curtis directly by email.

---

## Glossary

- **Repository (repo)** — a folder tracked by GitHub. Contains all code, history, and documentation for the project.
- **GitHub** — the website that hosts the repository. Think "Google Drive for code."
- **Push / Commit** — saving a change into the repository.
- **Pull request (PR)** — a proposed change that someone reviews before it becomes part of the project.
- **Deploy** — putting the app online so people can use it.
- **Render.com** — the hosting company that runs the app for us.
- **Blueprint** — Render's word for "read the `render.yaml` file and set everything up automatically."
- **GDS** — Global Distribution System. The reservation networks used by travel agencies (Galileo, Amadeus, Sabre).
- **PNR** — Passenger Name Record. A single booking inside a GDS.
- **ADM** — Agency Debit Memo. The fine an airline sends when a booking breaks a rule.
- **OCR** — Optical Character Recognition. Reading text out of an image (e.g. scanning a passport photo).
- **Flask** — the software framework the app is built on (Python-based).
- **SMTP** — the standard way software sends emails.
