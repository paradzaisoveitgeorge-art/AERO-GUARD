## What I'll build

A production-shaped passport ingest pipeline for AERO-GUARD that keeps the Consultant fast, gives the Helpdesk an audit trail, and never leaves passport pixels lying around.

### 1. OCR pipeline (Co-Pilot first, cloud fallback)

```text
[Drop / paste image]
       │
       ▼
 Tesseract.js (WASM, in-browser)  ──►  mrz.js parse  ──► fields
       │ if confidence < 80% OR MRZ checksum fails
       ▼
 server fn: textractAnalyzeId(imageBytes)  ──► fields
       │ (image never persisted; buffer wiped after call)
       ▼
 NCP validator (JSON rule engine)
       │
       ▼
 Verify table + DOCS SSR preview
       │
       ▼
 Apply ─► inject NM / DOCS SSR into terminal
         + write audit row (no image, only field hashes)
```

- Primary path runs entirely client-side. Image bytes never leave the browser unless cloud fallback triggers.
- Fallback uses `@aws-sdk/client-textract` `AnalyzeID` inside a `createServerFn`. The buffer is read once, sent to Textract, then explicitly zeroed; nothing is written to storage.

### 2. NCP rule engine (JSON-configured)

`src/lib/aeroguard/ncp-rules.json` — editable without redeploy:

```json
{
  "baseline": {
    "charset": "^[A-Z ]+$",
    "maxSurname": 56,
    "maxGiven": 56,
    "stripTitles": ["MR", "MRS", "MS", "MISS", "DR"],
    "diacriticsPolicy": "transliterate"
  },
  "carriers": {
    "QR": { "postTicketChange": "block", "maxCorrectionChars": 0 },
    "EK": { "postTicketChange": "reissue", "preTicketCorrectionChars": 3 },
    "ET": { "checkNameOrderSwap": true },
    "WB": { "checkNameOrderSwap": true }
  }
}
```

Validator returns `{ ok, fixes: [{field, from, to, reason}] }`. A single **Auto-Correct** button applies all fixes, or the consultant edits inline.

### 3. DOCS SSR mapping (exact GDS format)

Mapper in `src/lib/aeroguard/docs-ssr.ts`:

```text
3-{SURNAME}/{GIVEN1} {GIVEN2}MR
SR DOCS YY HK1-P-{NATIONALITY_ISO3}-{PASSPORT_NO}-{ISSUING_ISO3}-{DOB_DDMMMYY}-{SEX}-{EXPIRY_DDMMMYY}-{SURNAME}-{GIVEN_NAMES}/P{n}
```

- Dates normalised to `DDMMMYY` (e.g. `14MAR88`).
- Names uppercased, diacritics transliterated, hyphens/apostrophes removed, double spaces collapsed.
- Title (`MR/MRS/MISS`) split off the given-name string and appended to the NM element only.
- Per-passenger reference auto-numbered from PNR (`/P1`, `/P2`).

### 4. Helpdesk audit trail (Cloud)

- Enable Lovable Cloud.
- Tables:
  - `app_role` enum (`consultant`, `helpdesk_admin`).
  - `user_roles` (separate table; `has_role()` security-definer function — never on profile).
  - `ocr_audit_log`: `id, agent_id, pnr_locator, source ('local'|'textract'), confidence, field_hashes jsonb, ncp_fixes_applied jsonb, docs_ssr_pushed text, image_sha256, created_at`. **No raw PII, no image.**
- RLS:
  - Consultants can `INSERT` their own rows only.
  - `helpdesk_admin` can `SELECT` everything.
  - Nobody can `UPDATE` or `DELETE` (immutable audit).
- New route `/_authenticated/helpdesk/audit` gated by `has_role('helpdesk_admin')`. Table of recent OCR events, filter by PCC/date/source, expandable detail panel showing applied NCP fixes and the exact DOCS string injected.

### 5. Image lifecycle (encrypt-in-transit, wipe-at-rest)

- No Storage bucket is created for passport images — best privacy posture is "don't store at all".
- Cloud path (Textract): image is base64-encoded over HTTPS to the server fn, passed as `Bytes` directly to Textract, then the `Uint8Array` is `.fill(0)`-wiped and dereferenced. Textract `AnalyzeID` does not retain.
- Client path: the `File` reference is dropped from React state immediately after MRZ extraction.
- We store only `sha256(image_bytes)` in the audit row so Helpdesk can later prove a specific scan happened without retaining the document itself.

### 6. UI changes (inside the existing AERO-GUARD panel, Passport tab)

- Drop zone now accepts a real `File` (drag/paste/file-input).
- Live scanning state shows engine name + confidence.
- Verification table becomes editable; each cell shows an NCP badge (`OK`, `Auto-fix`, `Block`).
- New "DOCS SSR preview" code block shows the exact strings that will be pushed.
- Apply button is disabled while any NCP rule returns `block`.

## Technical notes

- Packages: `tesseract.js`, `mrz`, `@aws-sdk/client-textract`.
- Secrets needed (I'll request them after the plan is approved): `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`.
- Tesseract WASM is loaded lazily on first scan to keep initial bundle light.
- Audit writes go through a `createServerFn` with `requireSupabaseAuth` so the row is always tied to the real signed-in agent (no client-side spoofing).
- Helpdesk role assignment is manual for now (SQL insert into `user_roles`); I'll surface a one-line instruction.

## Out of scope (call out for next round)

- Actual Travelport TSAPI bridge — terminal injection remains the visual simulation we already have.
- Multi-pax bulk upload.
- ATPCO/airline-bulletin auto-sync into `ncp-rules.json`.