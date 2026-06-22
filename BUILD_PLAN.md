# AERO-GUARD Flask Clone — Build Plan

Source of truth: `lovable_source/` (TanStack Start + React + Tailwind + shadcn, from the client's Lovable export).
Target: Flask + Jinja + vanilla CSS/JS, matching the visual design and behavior as closely as possible.

Work through these in order — each step depends on the shared shell built in step 1.

- [x] 1. Design system / shared shell — colors, fonts, spacing from `styles.css`; Flask `base.html`, nav shell, shared partials (badge, card, table)
- [x] 2. `/provider` → Dashboard tab
- [x] 3. `/provider` → Agencies tab
- [x] 4. `/provider` → Users tab
- [x] 5. `/provider` → Vouchers tab
- [x] 6. `/provider` → Audits / Escalations / Policies tabs
- [x] 7. `/provider` → Emulate / Respond / Learning tabs
- [x] 8. `/` Smartpoint Demo — Violations + Vouchers tabs
- [x] 9. `/` Smartpoint Demo — Passport OCR flow (idle → scanning → verify → applied)
- [x] 10. `/` Smartpoint Demo — Learn + Help tabs

## Notes
- Source files are flattened (no folder structure) inside `lovable_source/` — `index.tsx` is the `/` route, `provider.tsx` is the `/provider` route.
- Mock data in the source (agencies, vouchers, alerts, escalations) overlaps with what's already in `aero_guard/backend/db.py` — reuse those shapes where possible instead of inventing new ones.
- Update the checkbox here as each step is finished so progress survives between sessions.
