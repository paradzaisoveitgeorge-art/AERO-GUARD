// AERO-GUARD Smartpoint smart-button demo — ported from lovable_source/index.tsx.
// Pure client-side state machine; nothing here needs a server round trip.

let panelOpen = false;
let savings = 4281.5;
let prevented = 11;
let pulse = true;
let resolved = null; // null | "fixed" | "ignored"
let ocrStep = "idle"; // idle | scanning | verify | applied
let previewUrl = null;

function togglePanel() {
  panelOpen = !panelOpen;
  document.getElementById("ag-panel").style.display = panelOpen ? "flex" : "none";
  document.getElementById("ag-toggle-btn").classList.toggle("open", panelOpen);
}

function setTab(name) {
  document.querySelectorAll(".ag-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll("[data-tabpanel]").forEach((p) => {
    p.style.display = p.dataset.tabpanel === name ? "block" : "none";
  });
}

function addCmdLines(lines) {
  const body = document.getElementById("cmd-body");
  const cursor = body.lastElementChild; // the blinking "> █" line stays last
  lines.forEach((text) => {
    const p = document.createElement("p");
    p.className = "cmd-line " + cmdLineClass(text);
    p.textContent = text;
    body.insertBefore(p, cursor);
  });
  body.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
}

function cmdLineClass(l) {
  if (l.startsWith("!!")) return "bang";
  if (l.startsWith("> AERO-GUARD") || l.startsWith("> SCAN")) return "indigo";
  if (l.startsWith(">")) return "amber";
  if (l.includes("VALIDATION OK") || l.includes("UPDATED")) return "ok";
  if (l.startsWith("> IGNORE")) return "dim";
  return "def";
}

function setPulse(on) {
  pulse = on;
  document.getElementById("ag-ping").style.display = on ? "block" : "none";
  document.getElementById("tab-glow").style.display = on ? "block" : "none";
}

function updateStats() {
  document.getElementById("stat-saved").textContent = "$" + Math.round(savings);
  document.getElementById("stat-prevented").textContent = prevented;
  const compliance = Math.min(99.9, 96.4 + prevented * 0.18).toFixed(1);
  document.getElementById("stat-score").textContent = compliance + "%";
  document.getElementById("tab-badge-prevented").textContent = prevented;
  document.getElementById("sb-compliance").textContent = compliance;
  document.getElementById("sb-savings").textContent = savings.toFixed(2);
}

function triggerViolation() {
  addCmdLines([
    "> SCAN :: PARSING FARE BASIS Y-FLEX/SU ...",
    "  FARE RULE LOOKUP :: LH-EU-2024",
    "!! MIN-STAY VIOLATION DETECTED ON S3 !!",
  ]);
  openViolation();
  setPulse(true);
}

function openViolation() {
  document.getElementById("violation-overlay").style.display = "flex";
}

function closeViolation() {
  document.getElementById("violation-overlay").style.display = "none";
  resetOverrideUi();
}

function resetOverrideUi() {
  document.getElementById("violation-primary-actions").style.display = "";
  document.getElementById("violation-override-box").style.display = "none";
  document.getElementById("override-reason").value = "";
  document.getElementById("override-note").value = "";
  document.getElementById("override-confirm-btn").disabled = true;
}

function showOverrideReason() {
  document.getElementById("violation-primary-actions").style.display = "none";
  document.getElementById("violation-override-box").style.display = "block";
}

function cancelOverride() {
  document.getElementById("violation-primary-actions").style.display = "";
  document.getElementById("violation-override-box").style.display = "none";
}

function onOverrideReasonChange() {
  const reason = document.getElementById("override-reason").value;
  document.getElementById("override-confirm-btn").disabled = !reason;
}

function applyFix() {
  closeViolation();
  resolved = "fixed";
  addCmdLines([
    "> FXX/S2,3/R,Y-PROMO",
    "  REPRICING ...",
    "  FARE BASIS UPDATED :: Y-PROMO",
    "  VALIDATION OK — ADM RISK CLEARED",
  ]);
  savings = +(savings + 450).toFixed(2);
  prevented += 1;
  setPulse(false);
  updateStats();
  document.getElementById("sb-resolved").textContent = "✓ Auto-fix applied";
  document.getElementById("sb-resolved").className = "fixed";
}

function confirmOverride() {
  const reason = document.getElementById("override-reason").value;
  if (!reason) return;
  const note = document.getElementById("override-note").value.trim();
  closeViolation();
  resolved = "overridden";

  const lines = [
    "> CONTINUE WITH PNR — OPERATOR OVERRIDE",
    "  RISK ACCEPTED :: MIN-STAY VIOLATION S3 · POTENTIAL ADM $450",
    "  JUSTIFICATION :: " + reason.toUpperCase(),
  ];
  if (note) lines.push("  NOTE :: " + note.toUpperCase());
  lines.push("  LOGGED TO AGENCY AUDIT TRAIL · OP J.STERLING");
  addCmdLines(lines);

  setPulse(false);
  document.getElementById("sb-resolved").textContent = "⚠ Risk accepted — override logged";
  document.getElementById("sb-resolved").className = "ignored";

  // Surface it in the panel's recent-activity feed so the audit trail is visible.
  const recent = document.querySelector(".ag-recent ul");
  if (recent) {
    const li = document.createElement("li");
    li.innerHTML = "&#9888; Override logged &middot; LH902 &middot; " + reason;
    recent.insertBefore(li, recent.firstChild);
  }
}

// ---------- Passport OCR flow ----------
function runOcr(file) {
  ocrStep = "scanning";
  document.getElementById("passport-idle").style.display = "none";
  document.getElementById("passport-scanning").style.display = "block";
  document.getElementById("passport-verify").style.display = "none";

  addCmdLines([
    "> AG.OCR :: MRZ DECODE INITIATED",
    "  SOURCE :: " + (file ? file.name : "PASTEBOARD") + " · " + (file ? (file.size / 1024).toFixed(0) : "--") + " KB",
    "  VISION-OCR :: READ ICAO 9303 ZONE",
  ]);

  setTimeout(() => {
    ocrStep = "verify";
    document.getElementById("passport-scanning").style.display = "none";
    document.getElementById("passport-verify").style.display = "block";
    document.getElementById("passport-actions").style.display = "flex";
    document.getElementById("passport-applied").style.display = "none";
    addCmdLines(["  PARSE OK :: 8 FIELDS EXTRACTED · CONF 98.6%"]);
  }, 900);
}

function onPassportFileChange(e) {
  const f = e.target.files && e.target.files[0];
  if (f) handlePassportImage(f);
}

function onPassportDrop(e) {
  e.preventDefault();
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) handlePassportImage(f);
}

function handlePassportImage(file) {
  if (!file.type.startsWith("image/")) return;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  const zone = document.getElementById("passport-idle");
  let img = zone.querySelector("img");
  if (!img) {
    img = document.createElement("img");
    zone.insertBefore(img, zone.firstChild);
  }
  img.src = previewUrl;
  runOcr(file);
}

document.addEventListener("paste", (e) => {
  if (!e.clipboardData) return;
  const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
  if (item) {
    const file = item.getAsFile();
    if (file) handlePassportImage(file);
  }
});

function applyPassport() {
  ocrStep = "applied";
  document.getElementById("passport-actions").style.display = "none";
  document.getElementById("passport-applied").style.display = "block";
  addCmdLines([
    "> 3-DEMHE/PATRICK",
    "> DOCS S-P-ZWE-FN438201-ZWE-14 MAR 1988-M-22 SEP 2029-DEMHE-PATRICK/JOHN",
    "  NAME ELEMENT PUSHED · DOCS SSR ATTACHED",
    "  AG :: DATA-FILL COMPLETE · PII WIPED FROM CACHE",
  ]);
}

function resetPassport() {
  ocrStep = "idle";
  document.getElementById("passport-verify").style.display = "none";
  document.getElementById("passport-idle").style.display = "flex";
}

// ---------- Visa requirement lookup (mock) ----------
// Keyed "NATIONALITY>DESTINATION". Anything not listed falls back to a
// generic "check with embassy" result so the demo never dead-ends.
const VISA_RULES = {
  "ZWE>GBR": { status: "required", label: "Visa required", detail: "Standard Visitor visa must be obtained before travel. Apply online; biometrics at VFS." },
  "ZWE>ZAF": { status: "free", label: "Visa-free", detail: "Up to 90 days visa-free for Zimbabwean passport holders." },
  "ZWE>ARE": { status: "voa", label: "Visa on arrival / e-visa", detail: "30-day e-visa available; sponsor or hotel booking may be requested." },
  "ZWE>USA": { status: "required", label: "Visa required", detail: "B1/B2 visa required. In-person interview at US Embassy Harare." },
  "ZWE>KEN": { status: "eta", label: "eTA required", detail: "Electronic Travel Authorisation required before boarding (East Africa)." },
  "ZAF>GBR": { status: "free", label: "Visa-free", detail: "Up to 6 months visa-free for South African passport holders." },
  "GBR>USA": { status: "eta", label: "ESTA required", detail: "Visa Waiver Program — ESTA authorisation required before travel." },
  "NGA>GBR": { status: "required", label: "Visa required", detail: "Standard Visitor visa required. Proof of funds and return ticket needed." },
  "IND>ARE": { status: "voa", label: "Visa on arrival / e-visa", detail: "14/30/90-day e-visa options available for Indian nationals." },
};

function lookupVisa() {
  const nat = document.getElementById("visa-nationality").value;
  const dest = document.getElementById("visa-destination").value;
  const box = document.getElementById("visa-result");

  if (nat === dest) {
    renderVisa(box, "free", "Domestic / same country", "No visa required — origin and destination nationality match.");
    return;
  }
  const rule = VISA_RULES[nat + ">" + dest] || {
    status: "check",
    label: "Confirm with embassy",
    detail: "No cached rule for this pairing. Verify with the destination embassy or IATA Timatic before ticketing.",
  };
  renderVisa(box, rule.status, rule.label, rule.detail);
}

function renderVisa(box, status, label, detail) {
  box.className = "ag-visa-result " + status;
  const badge = document.createElement("div");
  badge.className = "ag-visa-result__badge";
  badge.textContent = label;
  const body = document.createElement("div");
  body.className = "ag-visa-result__detail";
  body.textContent = detail;
  box.replaceChildren(badge, body);
  box.style.display = "block";
}

// Auto-trigger a violation a few seconds in so the demo feels live, same as the source.
setTimeout(triggerViolation, 2200);
updateStats();
