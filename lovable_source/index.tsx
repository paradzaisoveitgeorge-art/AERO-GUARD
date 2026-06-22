import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import passportScanAsset from "@/assets/aeroguard-passport-scan.mp4.asset.json";
import pnrValidatorAsset from "@/assets/aeroguard-pnr-validator.mp4.asset.json";
import admWatchAsset from "@/assets/aeroguard-adm-watch.mp4.asset.json";

const TUTORIALS = [
  {
    id: "passport-scan",
    title: "Passport Auto-Fill & MRZ Scan",
    blurb: "Drop a passport image — AERO-GUARD reads the MRZ, validates ICAO 9303, and pushes DOCS SSR to the PNR. Zero spelling errors.",
    duration: "1:42",
    tag: "DOCS · OCR",
    src: passportScanAsset.url,
  },
  {
    id: "pnr-validator",
    title: "Live PNR Rule Validator",
    blurb: "Watch AERO-GUARD intercept a min-stay breach mid-pricing and suggest the compliant fare basis before ticketing.",
    duration: "2:15",
    tag: "ADM · Rules",
    src: pnrValidatorAsset.url,
  },
  {
    id: "adm-watch",
    title: "ADM Watch & Voucher Issuance",
    blurb: "End-to-end demo: catch a tax-code violation, issue a goodwill voucher, and audit the trail from the helpdesk console.",
    duration: "2:58",
    tag: "Vouchers · Audit",
    src: admWatchAsset.url,
  },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AERO-GUARD — Smartpoint Smart Button Demo" },
      {
        name: "description",
        content:
          "Travelport Smartpoint mock with an AERO-GUARD smart button that surfaces vouchers and real-time ADM violation pop-ups.",
      },
    ],
  }),
  component: SmartpointDemo,
});

// ---------- Types ----------
type Violation = {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  title: string;
  segment: string;
  explanation: string;
  badFare: string;
  fixFare: string;
  fixCommand: string;
  penalty: number;
};

type Voucher = {
  id: string;
  tier: "Platinum" | "Gold" | "Silver";
  pax: string;
  amount: number;
  currency: string;
  status: "Active" | "Pending" | "Redeemed";
  airline: string;
  expires: string;
  policyRef: string;
};

const VIOLATION: Violation = {
  id: "ADM-9022",
  severity: "CRITICAL",
  title: "Min Stay Rule Breach",
  segment: "Segment 03 · LH 902 FRALON",
  explanation:
    "Fare basis Y-FLEX/SU requires a Sunday stayover. Current itinerary returns Friday 22OCT — issuance will trigger an ADM from LH.",
  badFare: "Y-FLEX/SU",
  fixFare: "Y-PROMO",
  fixCommand: "FXX/S2,3/R,Y-PROMO",
  penalty: 450,
};

const VOUCHERS: Voucher[] = [
  {
    id: "VCH-44021",
    tier: "Platinum",
    pax: "DEMHE/PATRICK",
    amount: 850,
    currency: "USD",
    status: "Active",
    airline: "QR",
    expires: "31DEC25",
    policyRef: "QR-PLT-2024-A",
  },
  {
    id: "VCH-44018",
    tier: "Gold",
    pax: "NCUBE/THANDIWE",
    amount: 420,
    currency: "USD",
    status: "Pending",
    airline: "FN",
    expires: "15NOV25",
    policyRef: "FN-GLD-2024-B",
  },
  {
    id: "VCH-44012",
    tier: "Silver",
    pax: "MOYO/TANAKA",
    amount: 180,
    currency: "USD",
    status: "Redeemed",
    airline: "FN",
    expires: "01JUL25",
    policyRef: "FN-SLV-2024-C",
  },
];

const PNR_LINES = [
  "H2ML1J/SP HREOU 68I4SP AG 68261126 04JUN",
  " 1.1DEMHE/PATRICK",
  " 2 LH 901 Y 15OCT LONFRA HK1 0730 1015 *PA* E",
  " 3 LH 902 Y 22OCT FRALON HK1 1820 1910 *PA* E",
  " FE PAX ONLY/NON-REF/CHG 150GBP",
  " FP CC VI 4111111111111111/1225",
  " FV LH",
  "",
  " ** VENDOR LOCATOR DATA EXISTS **  >*VL",
  " ** VENDOR REMARKS DATA EXISTS **  >*VR",
  " ** SERVICE INFORMATION EXISTS **  >*SI",
];

function SmartpointDemo() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [tab, setTab] = useState<"violations" | "passport" | "vouchers" | "learn" | "help">("violations");
  const [violationOpen, setViolationOpen] = useState(false);

  // Passport OCR state
  const [ocrStep, setOcrStep] = useState<"idle" | "scanning" | "verify" | "applied">("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [passport, setPassport] = useState({
    surname: "DEMHE",
    given: "PATRICK JOHN",
    nationality: "ZWE",
    dob: "14 MAR 1988",
    sex: "M",
    passportNo: "FN438201",
    expiry: "22 SEP 2029",
    mrz: "P<ZWEDEMHE<<PATRICK<JOHN<<<<<<<<<<<<<<<<<<<<\nFN4382014ZWE8803147M2909226<<<<<<<<<<<<<<04",
  });
  const passportExpired = useMemo(() => {
    const d = new Date(passport.expiry);
    return !isNaN(d.getTime()) && d.getTime() < Date.now();
  }, [passport.expiry]);

  const runOcr = (file?: File) => {
    setOcrStep("scanning");
    setCmdLines((l) => [
      ...l,
      "> AG.OCR :: MRZ DECODE INITIATED",
      `  SOURCE :: ${file ? file.name : "PASTEBOARD"} · ${file ? (file.size / 1024).toFixed(0) : "--"} KB`,
      "  VISION-OCR :: READ ICAO 9303 ZONE",
    ]);
    setTimeout(() => {
      setOcrStep("verify");
      setCmdLines((l) => [...l, "  PARSE OK :: 8 FIELDS EXTRACTED · CONF 98.6%"]);
    }, 900);
  };

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    runOcr(file);
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find((i) => i.type.startsWith("image/"));
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) handleImageFile(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const applyPassport = () => {
    setOcrStep("applied");
    setCmdLines((l) => [
      ...l,
      `> 3-${passport.surname}/${passport.given.split(" ")[0]}`,
      `> DOCS S-P-${passport.nationality}-${passport.passportNo}-${passport.nationality}-${passport.dob}-${passport.sex}-${passport.expiry}-${passport.surname}-${passport.given.replace(/ /g, "/")}`,
      "  NAME ELEMENT PUSHED · DOCS SSR ATTACHED",
      "  AG :: DATA-FILL COMPLETE · PII WIPED FROM CACHE",
    ]);
  };
  const [resolved, setResolved] = useState<null | "fixed" | "ignored">(null);
  const [savings, setSavings] = useState(4281.5);
  const [prevented, setPrevented] = useState(11);
  const [pulse, setPulse] = useState(true);

  const [cmdLines, setCmdLines] = useState<string[]>([
    "> AERO-GUARD :: SESSION ATTACHED · PNR H2ML1J",
    "> MONITORING ACTIVE · LISTENING FOR FARE/RULE EVENTS",
  ]);
  const cmdRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cmdRef.current?.scrollTo({ top: cmdRef.current.scrollHeight, behavior: "smooth" });
  }, [cmdLines]);

  // Auto-trigger a violation pop a few seconds in so demo feels live
  useEffect(() => {
    const t = setTimeout(() => triggerViolation(), 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerViolation = () => {
    setCmdLines((l) => [
      ...l,
      "> SCAN :: PARSING FARE BASIS Y-FLEX/SU ...",
      "  FARE RULE LOOKUP :: LH-EU-2024",
      "!! MIN-STAY VIOLATION DETECTED ON S3 !!",
    ]);
    setViolationOpen(true);
    setPulse(true);
  };

  const applyFix = () => {
    setViolationOpen(false);
    setResolved("fixed");
    setCmdLines((l) => [
      ...l,
      `> ${VIOLATION.fixCommand}`,
      "  REPRICING ...",
      "  FARE BASIS UPDATED :: Y-PROMO",
      "  VALIDATION OK — ADM RISK CLEARED",
    ]);
    setSavings((s) => +(s + VIOLATION.penalty).toFixed(2));
    setPrevented((n) => n + 1);
    setPulse(false);
  };

  const ignore = () => {
    setViolationOpen(false);
    setResolved("ignored");
    setCmdLines((l) => [...l, "> IGNORE FLAG SET — VIOLATION LOGGED FOR AUDIT"]);
    setPulse(false);
  };

  const compliance = useMemo(() => {
    const base = 96.4;
    return Math.min(99.9, base + prevented * 0.18).toFixed(1);
  }, [prevented]);

  return (
    <div className="flex h-screen w-screen flex-col bg-[#eceef1] text-zinc-800 font-sans overflow-hidden">
      {/* Smartpoint title bar */}
      <div className="flex h-7 items-center justify-between border-b border-zinc-300 bg-gradient-to-b from-[#f7f8fa] to-[#e3e6ea] px-3 text-[11px] text-zinc-600">
        <span className="font-semibold">Travelport Smartpoint — [Terminal Window 1]</span>
        <div className="flex gap-1">
          <span className="flex h-4 w-4 items-center justify-center rounded-sm hover:bg-zinc-300">_</span>
          <span className="flex h-4 w-4 items-center justify-center rounded-sm hover:bg-zinc-300">▢</span>
          <span className="flex h-4 w-4 items-center justify-center rounded-sm hover:bg-red-500 hover:text-white">×</span>
        </div>
      </div>

      {/* Menubar */}
      <div className="flex h-6 items-center gap-4 border-b border-zinc-300 bg-[#f3f4f6] px-3 text-[11px] text-zinc-700">
        {["File", "Edit", "View", "PNR", "Fares", "Tools", "Window", "Help"].map((m) => (
          <span key={m} className="cursor-default hover:text-zinc-900">{m}</span>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex h-9 items-center gap-2 border-b border-zinc-300 bg-[#fafbfc] px-2">
        <div className="flex items-center gap-1">
          {["☰", "✎", "⤓", "⤒", "↺", "↻"].map((i, idx) => (
            <button
              key={idx}
              className="flex h-7 w-7 items-center justify-center rounded border border-transparent text-zinc-600 hover:border-zinc-300 hover:bg-white"
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left icon rail */}
        <aside className="flex w-10 flex-col items-center gap-1 border-r border-zinc-300 bg-[#f3f4f6] py-2">
          {[
            { l: "🔍", k: "search" },
            { l: "🏷", k: "tags" },
            { l: "🔧", k: "tools" },
            { l: "💬", k: "chat" },
            { l: "M", k: "m" },
            { l: "♺", k: "sync" },
            { l: "?", k: "help" },
            { l: "⚙", k: "settings" },
          ].map((i) => (
            <button
              key={i.k}
              className="flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:bg-zinc-200"
            >
              {i.l}
            </button>
          ))}
          <div className="my-1 h-px w-6 bg-zinc-300" />

          {/* AERO-GUARD smart button */}
          <button
            onClick={() => setPanelOpen((o) => !o)}
            title="AERO-GUARD"
            className={`relative flex h-9 w-9 items-center justify-center rounded-md border text-[10px] font-extrabold tracking-tight transition ${
              panelOpen
                ? "border-indigo-500 bg-indigo-500 text-white shadow-md"
                : "border-zinc-400 bg-white text-indigo-600 hover:border-indigo-400"
            }`}
          >
            AG
            {pulse && (
              <>
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500 text-[8px] text-white items-center justify-center">!</span>
                </span>
              </>
            )}
          </button>

          <span className="mt-auto text-[9px] font-bold text-zinc-500">SB</span>
          <span className="text-[9px] font-bold text-zinc-500">FS</span>
        </aside>

        {/* PNR pane */}
        <section className="flex w-1/2 flex-col border-r border-zinc-300 bg-white">
          <div className="flex h-7 items-center gap-2 border-b border-zinc-300 bg-[#f3f4f6] px-3 text-[11px] text-zinc-600">
            <span className="rounded-sm bg-zinc-300 px-1.5 text-zinc-700">0</span>
            <span className="font-semibold">PNR–H2ML1J/DEMHE</span>
            <span className="ml-auto flex gap-2 text-zinc-500">
              <span>✎</span><span>⤒</span><span>↻</span><span>Aa</span><span>…</span>
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 font-mono text-[13px] leading-relaxed text-zinc-800">
            {PNR_LINES.map((l, i) => (
              <p key={i} className={pnrLineClass(l)}>{l || "\u00a0"}</p>
            ))}
            <div className="mt-3 flex gap-2">
              {["*ALL", "*P", "*VL", "*VR", "*SI"].map((b) => (
                <button
                  key={b}
                  className="rounded-sm border border-zinc-400 bg-zinc-200 px-3 py-1 text-[11px] font-semibold text-zinc-700 shadow-sm hover:bg-zinc-300"
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Command pane */}
        <section className="relative flex w-1/2 flex-col bg-[#1e1e1e] text-emerald-300">
          <div className="flex h-7 items-center justify-between border-b border-black/40 bg-sky-200 px-3 text-[11px] font-semibold text-sky-900">
            <span>1 — Command Window</span>
            <span>…</span>
          </div>
          <div ref={cmdRef} className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[12px]">
            {cmdLines.map((l, i) => (
              <p key={i} className={cmdLineClass(l)}>{l}</p>
            ))}
            <p className="text-emerald-300">{">"}<span className="animate-pulse">▊</span></p>
          </div>

          {/* AERO-GUARD slide-in panel */}
          {panelOpen && (
            <div
              className="absolute inset-y-0 right-0 z-30 flex w-[360px] flex-col border-l-2 border-indigo-500 bg-white text-zinc-800 shadow-2xl"
              style={{ animation: "popup-in 0.2s ease-out both" }}
            >
              <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-indigo-500 px-3 py-2 text-white">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-white text-[10px] font-extrabold text-indigo-600">AG</div>
                  <div>
                    <div className="text-[11px] font-bold leading-tight">AERO-GUARD</div>
                    <div className="text-[9px] opacity-80">Smart Button · v0.4</div>
                  </div>
                </div>
                <button onClick={() => setPanelOpen(false)} className="text-white/80 hover:text-white">×</button>
              </div>

              {/* Tabs — Command Strip */}
              <div className="flex border-b border-zinc-200 bg-zinc-50 text-[10px] font-semibold">
                {([
                  ["violations", "Alerts", prevented, pulse],
                  ["passport", "Passport", null, false],
                  ["vouchers", "Vouchers", VOUCHERS.length, false],
                  ["learn", "Learn", TUTORIALS.length, false],
                  ["help", "Help", null, false],
                ] as const).map(([k, label, badge, glow]) => (
                  <button
                    key={k}
                    onClick={() => setTab(k)}
                    className={`relative flex-1 py-2 transition ${
                      tab === k
                        ? "bg-white text-indigo-600 border-b-2 border-indigo-500"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    {label}
                    {badge !== null && (
                      <span className="ml-1 rounded-full bg-zinc-200 px-1.5 text-[9px] text-zinc-700">{badge}</span>
                    )}
                    {glow && (
                      <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-3 text-[12px]">
                {tab === "violations" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <Stat label="Saved" value={`$${savings.toFixed(0)}`} tone="brand" />
                      <Stat label="ADMs blocked" value={prevented.toString()} tone="success" />
                      <Stat label="Score" value={`${compliance}%`} tone="neutral" />
                    </div>

                    <button
                      onClick={() => setViolationOpen(true)}
                      className="flex w-full items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-left hover:bg-red-100"
                    >
                      <span className="mt-0.5 rounded-full bg-red-500 px-1.5 text-[9px] font-bold text-white">!</span>
                      <div className="flex-1">
                        <div className="text-[11px] font-bold text-red-700">{VIOLATION.title}</div>
                        <div className="text-[10px] text-zinc-500">{VIOLATION.segment}</div>
                      </div>
                      <span className="text-[10px] font-bold text-red-600">${VIOLATION.penalty}</span>
                    </button>

                    <div className="rounded-md border border-zinc-200 p-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Recent activity</div>
                      <ul className="mt-1 space-y-1 text-[11px] text-zinc-600">
                        <li>✓ Auto-fix applied · QR204 · saved $320</li>
                        <li>✓ SSR mismatch resolved · FN8123 · saved $180</li>
                        <li>⚠ Tax code mismatch · LH901 · manual review</li>
                      </ul>
                    </div>

                    <button
                      onClick={triggerViolation}
                      className="w-full rounded-md border border-indigo-200 bg-indigo-50 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      Re-scan PNR
                    </button>
                  </div>
                )}

                {tab === "passport" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        AERO-GUARD Data-Fill
                      </div>
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                        PII · auto-wipe
                      </span>
                    </div>

                    {ocrStep === "idle" && (
                      <div
                        onClick={() => runOcr()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const f = e.dataTransfer.files[0];
                          if (f) handleImageFile(f);
                        }}
                        className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-indigo-300 bg-indigo-50/40 p-5 text-center hover:border-indigo-500 hover:bg-indigo-50"
                      >
                        {previewUrl ? (
                          <img src={previewUrl} alt="Passport preview" className="mb-1 h-24 w-auto rounded object-contain" />
                        ) : (
                          <div className="text-2xl">📷</div>
                        )}
                        <div className="text-[11px] font-bold text-indigo-700">Drop / paste / click passport image</div>
                        <div className="text-[9px] text-zinc-500">MRZ · ICAO 9303 · JPG/PNG</div>
                        <button
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          className="mt-1 rounded bg-indigo-600 px-3 py-1 text-[10px] font-bold text-white"
                        >
                          Browse file
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleImageFile(f);
                          }}
                        />
                      </div>
                    )}

                    {ocrStep === "scanning" && (
                      <div className="rounded-md border border-indigo-200 bg-indigo-50 p-4 text-center">
                        <div className="text-[11px] font-bold text-indigo-700">Reading MRZ…</div>
                        <div className="mt-2 h-1 w-full overflow-hidden rounded bg-indigo-100">
                          <div
                            className="h-full w-1/3 bg-indigo-500"
                            style={{ animation: "scan 1s linear infinite" }}
                          />
                        </div>
                        <div className="mt-2 font-mono text-[9px] text-indigo-600">
                          OCR · TESSERACT-WASM · ZONE B
                        </div>
                      </div>
                    )}

                    {(ocrStep === "verify" || ocrStep === "applied") && (
                      <>
                        <div className="rounded-md border border-zinc-200 bg-white">
                          <div className="border-b border-zinc-200 bg-zinc-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                            Verify before push
                          </div>
                          <table className="w-full text-[10px]">
                            <tbody>
                              {[
                                ["Surname", passport.surname],
                                ["Given", passport.given],
                                ["Nationality", passport.nationality],
                                ["DOB", passport.dob],
                                ["Sex", passport.sex],
                                ["Passport #", passport.passportNo],
                                ["Expiry", passport.expiry],
                              ].map(([k, v]) => (
                                <tr key={k} className="border-b border-zinc-100 last:border-0">
                                  <td className="px-2 py-1 font-semibold text-zinc-500">{k}</td>
                                  <td className="px-2 py-1 font-mono text-zinc-800">{v}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="border-t border-zinc-200 bg-zinc-900 px-2 py-1 font-mono text-[8px] leading-tight text-emerald-300">
                            {passport.mrz.split("\n").map((m, i) => (
                              <div key={i}>{m}</div>
                            ))}
                          </div>
                        </div>

                        {passportExpired ? (
                          <div className="rounded-md border border-red-300 bg-red-50 p-2 text-[10px] font-bold text-red-700">
                            ⚠ Passport expired — block ticket issuance
                          </div>
                        ) : (
                          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-700">
                            ✓ Sanity check passed · valid &gt; 6 months
                          </div>
                        )}

                        {ocrStep === "applied" ? (
                          <div className="rounded-md border border-indigo-200 bg-indigo-50 p-2 text-center text-[11px] font-bold text-indigo-700">
                            ✓ Pushed to PNR · NM + DOCS SSR
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={applyPassport}
                              className="flex-1 rounded-md bg-indigo-600 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700"
                            >
                              Apply to PNR
                            </button>
                            <button
                              onClick={() => setOcrStep("idle")}
                              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-50"
                            >
                              Re-scan
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {tab === "vouchers" && (
                  <div className="space-y-2">
                    {VOUCHERS.map((v) => (
                      <div key={v.id} className="rounded-md border border-zinc-200 bg-white p-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${tierColor(v.tier)}`}>{v.tier}</span>
                              <span className="text-[11px] font-bold text-zinc-700">{v.id}</span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-zinc-600">{v.pax}</div>
                            <div className="text-[10px] text-zinc-400">{v.airline} · exp {v.expires} · {v.policyRef}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[13px] font-bold text-zinc-900">${v.amount}</div>
                            <div className={`text-[9px] font-bold uppercase ${statusColor(v.status)}`}>{v.status}</div>
                          </div>
                        </div>
                        <div className="mt-2 flex gap-1">
                          <button className="flex-1 rounded border border-indigo-500 bg-indigo-500 py-1 text-[10px] font-semibold text-white hover:bg-indigo-600">
                            Attach to PNR
                          </button>
                          <button className="flex-1 rounded border border-zinc-300 bg-white py-1 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50">
                            Details
                          </button>
                        </div>
                      </div>
                    ))}
                    <button className="w-full rounded-md border border-dashed border-zinc-300 py-2 text-[11px] font-semibold text-zinc-500 hover:border-indigo-400 hover:text-indigo-600">
                      + Issue new voucher
                    </button>
                  </div>
                )}

                {tab === "learn" && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      AERO-GUARD Tutorials
                    </div>
                    {TUTORIALS.map((t) => (
                      <div key={t.id} className="overflow-hidden rounded-md border border-zinc-200 bg-white">
                        <video
                          src={t.src}
                          controls
                          preload="metadata"
                          className="w-full bg-black"
                        />
                        <div className="p-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] font-bold text-zinc-800">{t.title}</div>
                            <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">
                              {t.tag}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] leading-snug text-zinc-500">{t.blurb}</p>
                          <div className="mt-1 text-[9px] font-mono text-zinc-400">{t.duration}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "help" && (
                  <div className="space-y-2">
                    <div className="rounded-md border border-zinc-200 p-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Ask AERO-GUARD</div>
                      <input
                        placeholder="e.g. How do I reissue a partially flown ticket?"
                        className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-[11px] focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      {[
                        "FXX command syntax",
                        "Min-stay rule examples",
                        "ADM dispute template",
                        "Tax code FOC vs Q",
                      ].map((q) => (
                        <button
                          key={q}
                          className="w-full rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-left text-[11px] text-zinc-700 hover:border-indigo-300 hover:bg-white"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[9px] text-zinc-500">
                Agent: J. STERLING · Session HREOU · GDS Travelport
              </div>
            </div>
          )}

          {/* Violation popup overlay */}
          {violationOpen && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
              <div
                className="w-full max-w-[380px] overflow-hidden rounded-lg border border-zinc-300 bg-white text-zinc-800 shadow-2xl"
                style={{ animation: "popup-in 0.22s cubic-bezier(0.2,0.9,0.3,1.2) both" }}
                role="alertdialog"
              >
                <div className="flex items-center justify-between bg-red-600 px-3 py-2 text-white">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-white text-[10px] font-extrabold text-red-600">AG</span>
                    <span className="text-[11px] font-bold tracking-wide">AERO-GUARD ALERT</span>
                  </div>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold">{VIOLATION.severity}</span>
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">{VIOLATION.title}</h3>
                    <p className="mt-1 text-[11px] text-zinc-500">{VIOLATION.segment}</p>
                  </div>

                  <p className="text-[11px] leading-snug text-zinc-600">{VIOLATION.explanation}</p>

                  <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2">
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Potential ADM</div>
                        <div className="text-xl font-bold text-red-600">${VIOLATION.penalty}.00</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Suggested fix</div>
                        <div className="text-[12px] font-bold text-indigo-600">Apply {VIOLATION.fixFare}</div>
                      </div>
                    </div>
                    <div className="mt-2 rounded bg-zinc-900 px-2 py-1.5 font-mono text-[10px] text-emerald-400">
                      {VIOLATION.fixCommand}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={applyFix}
                      className="w-full rounded-md bg-indigo-600 py-2 text-[12px] font-bold text-white hover:bg-indigo-700"
                    >
                      Apply One-Click Fix
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={ignore}
                        className="flex-1 rounded-md border border-zinc-300 bg-white py-1.5 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-50"
                      >
                        Ignore
                      </button>
                      <button
                        onClick={() => alert(VIOLATION.explanation)}
                        className="flex-1 rounded-md border border-zinc-300 bg-white py-1.5 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-50"
                      >
                        Why?
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Status bar */}
      <div className="flex h-6 items-center justify-between border-t border-zinc-300 bg-[#f3f4f6] px-3 text-[10px] text-zinc-600">
        <div className="flex gap-4">
          <span>Connection: <span className="font-semibold text-emerald-600">●</span> Live</span>
          <span>PCC: HREOU</span>
          <span>Agent: J. STERLING</span>
        </div>
        <div className="flex gap-4">
          <span>AERO-GUARD: <span className="font-semibold text-indigo-600">ACTIVE</span></span>
          <span>Compliance {compliance}%</span>
          <span>Saved ${savings.toFixed(2)}</span>
          {resolved === "fixed" && <span className="font-semibold text-emerald-600">✓ Auto-fix applied</span>}
          {resolved === "ignored" && <span className="font-semibold text-amber-600">⚠ Violation ignored</span>}
        </div>
      </div>
    </div>
  );
}

function pnrLineClass(l: string) {
  if (l.startsWith(" 1.1")) return "text-emerald-600";
  if (l.includes("**")) return "text-emerald-700";
  if (l.startsWith("H2ML")) return "text-zinc-900 font-semibold";
  return "text-zinc-800";
}

function cmdLineClass(l: string) {
  if (l.startsWith("!!")) return "text-red-400 font-bold";
  if (l.startsWith("> AERO-GUARD") || l.startsWith("> SCAN")) return "text-indigo-300";
  if (l.startsWith(">")) return "text-amber-300";
  if (l.includes("VALIDATION OK") || l.includes("UPDATED")) return "text-emerald-400 font-semibold";
  if (l.startsWith("> IGNORE")) return "text-zinc-400";
  return "text-emerald-300/80";
}

function tierColor(t: Voucher["tier"]) {
  if (t === "Platinum") return "bg-zinc-800 text-white";
  if (t === "Gold") return "bg-amber-400 text-amber-950";
  return "bg-zinc-300 text-zinc-700";
}

function statusColor(s: Voucher["status"]) {
  if (s === "Active") return "text-emerald-600";
  if (s === "Pending") return "text-amber-600";
  return "text-zinc-400";
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "brand" | "success" | "neutral" }) {
  const color =
    tone === "brand" ? "text-indigo-600" : tone === "success" ? "text-emerald-600" : "text-zinc-800";
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-1.5 text-center">
      <div className="text-[8px] font-bold uppercase tracking-wider text-zinc-400">{label}</div>
      <div className={`text-[12px] font-bold ${color}`}>{value}</div>
    </div>
  );
}
