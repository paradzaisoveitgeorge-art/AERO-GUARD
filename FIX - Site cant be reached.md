# AERO-GUARD — "This site can't be reached" (how to fix)

If your browser shows this message:

> **This site can't be reached** — localhost refused to connect.
> ERR_CONNECTION_REFUSED

…it does **not** mean AERO-GUARD is broken. It only means the AERO-GUARD
program is **not running yet** on your computer, so the browser has nothing
to connect to.

Think of it like this: the browser is the TV screen, and AERO-GUARD is the
set-top box. The screen is on, but the box is switched off. We just need to
switch the box on.

Follow the steps below **in order**. Most of the time, only Step 1 and
Step 2 are needed.

---

## Step 1 — Start AERO-GUARD

1. Open the **AERO-GUARD** folder (the one that contains `START.bat`,
   `SETUP.bat` and `HOW-TO-USE.txt`).
2. Double-click **`START.bat`**.
3. A **black window** opens. This is the AERO-GUARD engine — **leave it
   open**. Closing it switches AERO-GUARD off again.
4. Wait about **5–10 seconds**. Your web browser will open automatically at
   the login page.

**Sign in with:**

- Email: `soviet@aero-guard.io`
- Password: `aeroguard`

> ✅ If the login page appears, you're done. Skip the rest of this document.

---

## Step 2 — If the page still shows the error, just reload

Sometimes the browser opens a moment **before** the engine has finished
starting. That is normal.

1. Make sure the **black window** from Step 1 is still open.
2. Wait another **10 seconds**.
3. On the error page, click the blue **Reload** button
   (or press the **F5** key).

Repeat the reload once or twice if needed. Once the engine is ready, the
login page appears.

> **Tip:** If you closed the black window by accident, AERO-GUARD stops.
> Just go back to Step 1 and double-click `START.bat` again.

---

## Step 3 — If the black window says "Setup has not been run yet"

This means the one-time setup was never completed on this computer.

1. In the AERO-GUARD folder, double-click **`SETUP.bat`**.
2. A black window opens and installs everything needed. This takes about
   **2–3 minutes** — please wait for it to finish.
3. When you see **"Setup complete!"**, press any key to close that window.
4. Now go back to **Step 1** and double-click `START.bat`.

---

## Step 4 — If setup says "Python is not installed"

AERO-GUARD needs a free program called **Python** to run. If `SETUP.bat`
tells you Python is missing:

1. Go to **https://www.python.org/downloads/**
2. Click the big yellow **"Download Python"** button and run the installer.
3. **IMPORTANT:** On the very first installer screen, tick the box that says
   **"Add Python to PATH"** before clicking **Install Now**.
4. When it finishes, go back to **Step 3** (run `SETUP.bat`), then **Step 1**
   (run `START.bat`).

---

## Step 5 — Check the address in the browser

AERO-GUARD only answers at this exact address:

```
http://localhost:5050/login
```

- Make sure the address bar says **`localhost:5050`** (not a different
  number, and not `https://`).
- If it's wrong, type the address above and press **Enter** — while the
  black window from Step 1 is open.

---

## Quick checklist

| Question | If NO, do this |
|---|---|
| Is the **black window** open? | Double-click `START.bat` (Step 1) |
| Did you **wait 10 seconds** and click **Reload**? | Do Step 2 |
| Does the black window say **"Setup has not been run"**? | Run `SETUP.bat` (Step 3) |
| Does it say **"Python is not installed"**? | Install Python (Step 4) |
| Is the address **`localhost:5050/login`**? | Fix the address (Step 5) |

---

## Still stuck?

If none of the above works:

1. Take a photo or screenshot of the **black window** (it contains the error
   messages that explain what went wrong).
2. Send it to your developer.

That black-window text is the single most useful thing for diagnosing the
problem — please include it.

---

*Everyday use reminder:* once set up, you only ever need to double-click
**`START.bat`** to use AERO-GUARD, and close the **black window** when you're
finished. You do **not** need to run `SETUP.bat` again.
