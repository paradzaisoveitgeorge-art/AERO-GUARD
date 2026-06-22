import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import passportVideo from "@/assets/aeroguard-passport-scan.mp4.asset.json";
import pnrVideo from "@/assets/aeroguard-pnr-validator.mp4.asset.json";
import admVideo from "@/assets/aeroguard-adm-watch.mp4.asset.json";

const HERO_VIDEOS = [pnrVideo.url, admVideo.url, passportVideo.url];

export const Route = createFileRoute("/provider")({
  head: () => ({
    meta: [
      { title: "AERO-GUARD · Helpdesk Console" },
      { name: "description", content: "Helpdesk operator console for AERO-GUARD." },
    ],
  }),
  component: ProviderConsole,
});

// ============================================================
// Types & mock data
// ============================================================
type NavKey =
  | "DASHBOARD"
  | "AGENCIES"
  | "USERS"
  | "VOUCHERS"
  | "AUDITS"
  | "ESCALATIONS"
  | "EMULATE"
  | "RESPOND"
  | "LEARNING"
  | "POLICIES";

type Agency = {
  id: string; name: string; pcc: string; gds: "1G" | "1A" | "1S";
  country: string; seats: number; usedSeats: number;
  status: "ACTIVE" | "SUSPENDED" | "PROVISIONING" | "TRIAL" | "ARCHIVED";
  monthAdms: number; lastActive: string; policyLevel: "BASIC" | "STANDARD" | "ENTERPRISE";
  adminEmail: string;
};

type HelpdeskUser = {
  id: string; name: string; email: string; role: "L1" | "L2" | "ADMIN"; active: boolean;
  mfa: boolean; lastLogin: string;
};

type Alert = {
  id: string; severity: "INFO" | "WARN" | "CRIT"; source: string; title: string;
  time: string; ongoing: boolean; impactedAgencies: number;
};

type Voucher = {
  id: string; pax: string; pnr: string; ticket: string; reason: string;
  amount: number; currency: string; payment: string; card: string;
  policy: string; status: "ISSUED" | "REDEEMED" | "EXPIRED" | "VOID";
  issued: string;
};

type Escalation = {
  id: string; agency: string; pnr: string; subject: string;
  level: "L1" | "L2" | "VENDOR"; priority: "LOW" | "MED" | "HIGH";
  opened: string; status: "OPEN" | "PENDING" | "RESOLVED"; sla: string;
};

type PendingIssue = {
  id: string; agency: string; type: string; summary: string; age: string;
  priority: "LOW" | "MED" | "HIGH";
};

const INITIAL_AGENCIES: Agency[] = [
  { id: "AG-1001", name: "Skylink Travel", pcc: "7XQ9", gds: "1G", country: "ZW", seats: 25, usedSeats: 22, status: "ACTIVE", monthAdms: 2, lastActive: "3 min ago", policyLevel: "STANDARD", adminEmail: "admin@skylink.zw" },
  { id: "AG-1002", name: "Voyage Africa", pcc: "K3P1", gds: "1G", country: "ZA", seats: 60, usedSeats: 55, status: "ACTIVE", monthAdms: 7, lastActive: "12 min ago", policyLevel: "ENTERPRISE", adminEmail: "ops@voyage.co.za" },
  { id: "AG-1003", name: "BlueSky Holidays", pcc: "QM44", gds: "1A", country: "KE", seats: 15, usedSeats: 9, status: "TRIAL", monthAdms: 0, lastActive: "1 hr ago", policyLevel: "BASIC", adminEmail: "info@bluesky.ke" },
  { id: "AG-1004", name: "Continental Tours", pcc: "B2H7", gds: "1G", country: "ZW", seats: 12, usedSeats: 11, status: "SUSPENDED", monthAdms: 14, lastActive: "4 days ago", policyLevel: "STANDARD", adminEmail: "tt@continental.zw" },
  { id: "AG-1005", name: "Equator Travel", pcc: "EQ12", gds: "1A", country: "UG", seats: 8, usedSeats: 0, status: "PROVISIONING", monthAdms: 0, lastActive: "—", policyLevel: "BASIC", adminEmail: "admin@equator.ug" },
  { id: "AG-1006", name: "Mara Routes", pcc: "MR55", gds: "1S", country: "KE", seats: 20, usedSeats: 4, status: "ARCHIVED", monthAdms: 0, lastActive: "3 mo ago", policyLevel: "BASIC", adminEmail: "hello@mara.ke" },
];

const INITIAL_USERS: HelpdeskUser[] = [
  { id: "U-01", name: "Soviet Moyo", email: "soviet@aero-guard.io", role: "ADMIN", active: true, mfa: true, lastLogin: "now" },
  { id: "U-02", name: "Tariro Ncube", email: "tariro@aero-guard.io", role: "L2", active: true, mfa: true, lastLogin: "2 hr ago" },
  { id: "U-03", name: "Kelvin Owusu", email: "kelvin@aero-guard.io", role: "L1", active: true, mfa: false, lastLogin: "yesterday" },
  { id: "U-04", name: "Amina Yusuf", email: "amina@aero-guard.io", role: "L1", active: false, mfa: false, lastLogin: "21 days ago" },
];

const ALERTS: Alert[] = [
  { id: "A1", severity: "CRIT", source: "1G GALILEO", title: "Intermittent timeouts on AP-2 host", time: "14:02", ongoing: true, impactedAgencies: 23 },
  { id: "A2", severity: "WARN", source: "QR AIRWAYS", title: "DOH ground stop — IROPS protective rebooking advised", time: "13:41", ongoing: true, impactedAgencies: 8 },
  { id: "A3", severity: "INFO", source: "AERO-GUARD", title: "NCP rules v4.12 published (EK, ET, WB)", time: "11:20", ongoing: false, impactedAgencies: 45 },
  { id: "A4", severity: "WARN", source: "ET AIRLINES", title: "Schedule change wave — 312 PNRs require action", time: "09:15", ongoing: true, impactedAgencies: 14 },
];

const PENDING_ISSUES: PendingIssue[] = [
  { id: "P-1", agency: "Skylink Travel", type: "DOCS SSR", summary: "Passport hyphen rejected — 3 PAX", age: "8 min", priority: "HIGH" },
  { id: "P-2", agency: "Voyage Africa", type: "ADM Dispute", summary: "QR/2510 evidence pack pending", age: "1 hr", priority: "HIGH" },
  { id: "P-3", agency: "BlueSky Holidays", type: "Onboarding", summary: "SSO redirect failing", age: "3 hr", priority: "MED" },
  { id: "P-4", agency: "Continental Tours", type: "Voucher", summary: "VCH-44018 awaiting approval >$500", age: "5 hr", priority: "MED" },
];

const INITIAL_VOUCHERS: Voucher[] = [
  { id: "VCH-44021", pax: "MOYO/SOVIET", pnr: "X7K2QP", ticket: "157-2244778899", reason: "Schedule change >4h", amount: 120, currency: "USD", payment: "REFUND", card: "•••• 4421", policy: "IROPS-A", status: "ISSUED", issued: "today" },
  { id: "VCH-44020", pax: "NCUBE/T MRS", pnr: "RR81LM", ticket: "157-2244778812", reason: "Goodwill", amount: 50, currency: "USD", payment: "VOUCHER", card: "—", policy: "GOODWILL", status: "REDEEMED", issued: "today" },
];

const INITIAL_ESCALATIONS: Escalation[] = [
  { id: "ESC-7781", agency: "Skylink Travel", pnr: "X7K2QP", subject: "PCC emulation failing — auth token expired", level: "L2", priority: "HIGH", opened: "12 min ago", status: "PENDING", sla: "48 min left" },
  { id: "ESC-7780", agency: "Voyage Africa", pnr: "RR81LM", subject: "ADM dispute QR/2510 — needs evidence pack", level: "VENDOR", priority: "HIGH", opened: "1 hr ago", status: "OPEN", sla: "3 hr left" },
  { id: "ESC-7779", agency: "BlueSky Holidays", pnr: "—", subject: "Onboarding: SSO not redirecting", level: "L1", priority: "MED", opened: "3 hr ago", status: "OPEN", sla: "21 hr left" },
];

const COUNTRIES = ["ZW", "ZA", "KE", "UG", "TZ", "NG", "GH", "ET", "RW", "BW"];
const CURRENCIES = ["USD", "EUR", "ZAR", "KES", "UGX", "NGN", "GHS", "ZWL", "RWF"];
const POLICY_TEMPLATES = ["Standard Compliance", "Full Enterprise", "Trial / Lite", "Custom"];

// ============================================================
// Root
// ============================================================
function ProviderConsole() {
  const [nav, setNav] = useState<NavKey>("DASHBOARD");
  const [query, setQuery] = useState("");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex">
      <Sidebar nav={nav} setNav={setNav} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar query={query} setQuery={setQuery} />
        <main className="flex-1 overflow-auto p-6">
          {nav === "DASHBOARD" && <Dashboard setNav={setNav} />}
          {nav === "AGENCIES" && <AgenciesPanel />}
          {nav === "USERS" && <UsersPanel />}
          {nav === "VOUCHERS" && <VouchersPanel />}
          {nav === "AUDITS" && <AuditsPanel />}
          {nav === "ESCALATIONS" && <EscalationsPanel />}
          {nav === "EMULATE" && <EmulatePanel />}
          {nav === "RESPOND" && <RespondPanel />}
          {nav === "LEARNING" && <LearningPanel />}
          {nav === "POLICIES" && <PoliciesPanel />}
        </main>
      </div>
    </div>
  );
}

// ============================================================
// Sidebar
// ============================================================
const NAV_GROUPS: { label: string; items: { key: NavKey; label: string; icon: string }[] }[] = [
  { label: "OVERVIEW", items: [{ key: "DASHBOARD", label: "Dashboard", icon: "▦" }] },
  { label: "OPERATIONAL CONTROL", items: [
    { key: "AGENCIES", label: "Agency Provisioning", icon: "🏢" },
    { key: "USERS", label: "Helpdesk Users", icon: "👥" },
    { key: "VOUCHERS", label: "Vouchers", icon: "🎟" },
  ]},
  { label: "INTELLIGENCE", items: [{ key: "AUDITS", label: "Agency ADM Audits", icon: "📊" }] },
  { label: "SUPPORT TOOLS", items: [
    { key: "ESCALATIONS", label: "Escalations", icon: "⚠" },
    { key: "EMULATE", label: "Emulate into PCC", icon: "⌨" },
    { key: "RESPOND", label: "Respond to Clients", icon: "💬" },
  ]},
  { label: "KNOWLEDGE", items: [
    { key: "LEARNING", label: "My Learning", icon: "🎓" },
    { key: "POLICIES", label: "Terms & Policies", icon: "📜" },
  ]},
];

function Sidebar({ nav, setNav }: { nav: NavKey; setNav: (k: NavKey) => void }) {
  return (
    <aside className="w-64 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
      <button
        onClick={() => setNav("DASHBOARD")}
        className="flex items-center gap-2 px-5 py-4 border-b border-slate-800 hover:bg-slate-800/40 transition text-left"
      >
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center font-bold text-white text-sm">AG</div>
        <div>
          <div className="text-sm font-semibold tracking-wide">AERO-GUARD</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-widest">Helpdesk Console</div>
        </div>
      </button>

      <nav className="flex-1 overflow-auto py-4">
        {NAV_GROUPS.map((g) => (
          <div key={g.label} className="mb-4 px-3">
            <div className="px-2 text-[10px] font-semibold text-slate-500 tracking-widest mb-1">{g.label}</div>
            {g.items.map((it) => {
              const active = nav === it.key;
              return (
                <button
                  key={it.key}
                  onClick={() => setNav(it.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                    active
                      ? "bg-indigo-600/15 text-indigo-300 border-l-2 border-indigo-500"
                      : "text-slate-300 hover:bg-slate-800/60 border-l-2 border-transparent"
                  }`}
                >
                  <span className="text-base w-4 text-center">{it.icon}</span>
                  <span>{it.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <Link to="/" className="block w-full text-center text-xs text-slate-400 hover:text-slate-200 py-2 rounded-md hover:bg-slate-800/60">
          ← Consultant view
        </Link>
      </div>
    </aside>
  );
}

// ============================================================
// Top bar
// ============================================================
function TopBar({ query, setQuery }: { query: string; setQuery: (s: string) => void }) {
  return (
    <header className="h-14 bg-slate-900/70 backdrop-blur border-b border-slate-800 flex items-center px-6 gap-4">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agencies, PNRs, vouchers, tickets…"
            className="w-full bg-slate-800/60 border border-slate-700 rounded-md pl-9 pr-3 py-1.5 text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">⌕</span>
        </div>
      </div>
      <button
        className="relative p-2 rounded-md hover:bg-slate-800 text-slate-300"
        onClick={() => toast("3 unread service alerts")}
        aria-label="Notifications"
      >
        🔔
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
      </button>
      <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold">SM</div>
        <div className="text-xs leading-tight">
          <div className="font-medium">Soviet Moyo</div>
          <div className="text-slate-500">Admin · MFA verified</div>
        </div>
      </div>
    </header>
  );
}

// ============================================================
// Dashboard
// ============================================================
function Dashboard({ setNav }: { setNav: (k: NavKey) => void }) {
  const admsPrevented = 12;
  const dollarSaved = admsPrevented * 350; // ~$4,200

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome hero with looping AERO-GUARD intro video */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800 min-h-[280px]">
        <HeroVideo />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/40" />
        <div className="relative p-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-indigo-900/40">AG</div>
            <div>
              <h1 className="text-2xl font-semibold">Welcome to AERO-GUARD, Soviet</h1>
              <p className="text-slate-300 text-sm">Active Revenue Sentinel · MFA verified · session 14:02</p>
            </div>
          </div>
          <p className="text-xs text-indigo-200/80 uppercase tracking-widest mt-3">Intelligent Compliance for Travel</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Stat label="Active Agencies" value="45" tone="emerald" sub="↑ 3 this week" />
            <Stat label="ADMs Prevented Today" value={String(admsPrevented)} tone="indigo" sub={`$${dollarSaved.toLocaleString()} saved`} />
            <Stat label="Pending Escalations" value="3" tone="amber" sub="1 high priority" />
            <Stat label="System Uptime (30d)" value="99.97%" tone="sky" sub="No incidents 7d" />
          </div>
        </div>
      </div>

      {/* Compliance visuals row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ComplianceCard
          title="NCP Validator Walkthrough"
          desc="3-min refresher on name conflict prevention rules"
          tag="VIDEO · 3:14"
          gradient="from-indigo-600 to-sky-600"
          icon="▶"
        />
        <ComplianceCard
          title="DOCS SSR Cheat Sheet"
          desc="Passport edge cases: hyphens, suffixes, transliteration"
          tag="GUIDE · PDF"
          gradient="from-emerald-600 to-teal-600"
          icon="📄"
        />
        <ComplianceCard
          title="ADM Dispute Playbook"
          desc="Evidence pack templates for QR, EK, ET disputes"
          tag="DOC · v4.12"
          gradient="from-amber-600 to-rose-600"
          icon="🛡"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service alerts */}
        <Card className="lg:col-span-2" title="Service Alerts" subtitle="Airlines · GDS · System">
          <ul className="divide-y divide-slate-800">
            {ALERTS.map((a) => (
              <li key={a.id} className="py-3 flex items-start gap-3">
                <SeverityDot s={a.severity} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                    <span className="font-semibold text-slate-300">{a.source}</span>
                    <span>·</span>
                    <span>{a.time}</span>
                    {a.ongoing && <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[10px]">ONGOING</span>}
                    <span className="ml-auto px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 text-[10px]">
                      CLIENT IMPACT: {a.impactedAgencies} agencies
                    </span>
                  </div>
                  <div className="text-sm mt-0.5">{a.title}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* Pending issues */}
        <Card title="Pending Issues" subtitle="Awaiting helpdesk action">
          <ul className="space-y-3">
            {PENDING_ISSUES.map((p) => (
              <li key={p.id} className="p-3 rounded-md bg-slate-800/40 border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400">{p.id}</span>
                  <PriorityBadge p={p.priority} />
                </div>
                <div className="text-sm mt-1">{p.summary}</div>
                <div className="text-xs text-slate-500 mt-1">{p.agency} · {p.type} · {p.age}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Quick actions including Quick Audit */}
      <Card title="Quick Actions">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <QuickAction label="Quick Audit (PNR)" icon="⚡" onClick={() => {
            const pnr = window.prompt("Enter PNR for quick compliance check");
            if (pnr) toast.success(`Quick audit ${pnr.toUpperCase()} — compliant ✓`);
          }} />
          <QuickAction label="Provision Agency" icon="🏢" onClick={() => setNav("AGENCIES")} />
          <QuickAction label="Emulate PCC" icon="⌨" onClick={() => setNav("EMULATE")} />
          <QuickAction label="Issue Voucher" icon="🎟" onClick={() => setNav("VOUCHERS")} />
          <QuickAction label="Respond to Client" icon="💬" onClick={() => setNav("RESPOND")} />
        </div>
      </Card>

      {/* My profile + socials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="My Profile">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold">SM</div>
            <div>
              <div className="font-medium">Soviet Moyo</div>
              <div className="text-xs text-slate-400">Admin · MFA ✓ · L2 certified</div>
            </div>
          </div>
        </Card>
        <Card title="My Learning">
          <div className="text-xs text-slate-400 mb-2">Next module</div>
          <div className="text-sm font-medium">NDC Order Management — 60% complete</div>
          <div className="h-1.5 bg-slate-800 rounded mt-2 overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: "60%" }} /></div>
          <button onClick={() => setNav("LEARNING")} className="mt-3 text-xs text-indigo-300 hover:text-indigo-200">Continue learning →</button>
        </Card>
        <Card title="Socials & Team">
          <div className="flex gap-2 text-lg">
            <a className="w-9 h-9 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center" title="LinkedIn">in</a>
            <a className="w-9 h-9 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center" title="Slack">#</a>
            <a className="w-9 h-9 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center" title="Email">✉</a>
            <a className="w-9 h-9 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center" title="X">𝕏</a>
          </div>
        </Card>
      </div>
    </div>
  );
}

function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onEnded = () => setIdx((i) => (i + 1) % HERO_VIDEOS.length);
    v.addEventListener("ended", onEnded);
    v.play().catch(() => {});
    return () => v.removeEventListener("ended", onEnded);
  }, [idx]);
  return (
    <video
      ref={videoRef}
      src={HERO_VIDEOS[idx]}
      autoPlay
      muted
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

function ComplianceCard({ title, desc, tag, gradient, icon }: { title: string; desc: string; tag: string; gradient: string; icon: string }) {
  return (
    <button className="text-left rounded-lg overflow-hidden border border-slate-800 bg-slate-900 hover:border-indigo-500/40 transition group">
      <div className={`aspect-video bg-gradient-to-br ${gradient} relative flex items-center justify-center`}>
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition" />
        <div className="relative w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-xl">{icon}</div>
        <span className="absolute top-2 right-2 text-[10px] font-mono bg-black/40 px-1.5 py-0.5 rounded">{tag}</span>
      </div>
      <div className="p-3">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
      </div>
    </button>
  );
}

// ============================================================
// Agencies
// ============================================================
type SortKey = "name" | "adms" | "seats" | "lastActive";
function AgenciesPanel() {
  const [agencies, setAgencies] = useState<Agency[]>(INITIAL_AGENCIES);
  const [showAdd, setShowAdd] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterGds, setFilterGds] = useState("ALL");
  const [filterCountry, setFilterCountry] = useState("ALL");
  const [filterPolicy, setFilterPolicy] = useState("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    const filtered = agencies.filter((a) =>
      (filterGds === "ALL" || a.gds === filterGds) &&
      (filterCountry === "ALL" || a.country === filterCountry) &&
      (filterPolicy === "ALL" || a.policyLevel === filterPolicy)
    );
    const arr = [...filtered].sort((a, b) => {
      let v = 0;
      if (sortBy === "name") v = a.name.localeCompare(b.name);
      else if (sortBy === "adms") v = a.monthAdms - b.monthAdms;
      else if (sortBy === "seats") v = (a.usedSeats / a.seats) - (b.usedSeats / b.seats);
      else v = a.lastActive.localeCompare(b.lastActive);
      return sortDir === "asc" ? v : -v;
    });
    return arr;
  }, [agencies, sortBy, sortDir, filterGds, filterCountry, filterPolicy]);

  const toggleSort = (k: SortKey) => {
    if (sortBy === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(k); setSortDir("asc"); }
  };

  const toggleSelect = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const selectAll = () => setSelected(selected.size === sorted.length ? new Set() : new Set(sorted.map((a) => a.id)));

  const bulkAction = (action: "SUSPEND" | "REACTIVATE" | "DELETE") => {
    if (selected.size === 0) { toast.error("No agencies selected"); return; }
    if (action === "DELETE") {
      setAgencies((arr) => arr.filter((a) => !selected.has(a.id)));
    } else {
      setAgencies((arr) => arr.map((a) => selected.has(a.id) ? { ...a, status: action === "SUSPEND" ? "SUSPENDED" : "ACTIVE" } : a));
    }
    toast.success(`Bulk ${action.toLowerCase()} applied to ${selected.size} agencies`);
    setSelected(new Set());
  };

  return (
    <PageShell title="Agency Provisioning" subtitle="Add, configure, suspend or remove agencies on AERO-GUARD"
      action={<button onClick={() => setShowAdd(true)} className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm font-medium">+ Provision Agency</button>}
    >
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <FilterSelect label="GDS" value={filterGds} onChange={setFilterGds} options={["ALL", "1G", "1A", "1S"]} />
        <FilterSelect label="Country" value={filterCountry} onChange={setFilterCountry} options={["ALL", ...COUNTRIES]} />
        <FilterSelect label="Policy" value={filterPolicy} onChange={setFilterPolicy} options={["ALL", "BASIC", "STANDARD", "ENTERPRISE"]} />
        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-slate-400">{selected.size} selected</span>
            <button onClick={() => bulkAction("SUSPEND")} className="px-2 py-1 rounded bg-amber-600/20 text-amber-300 hover:bg-amber-600/30">Suspend</button>
            <button onClick={() => bulkAction("REACTIVATE")} className="px-2 py-1 rounded bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30">Reactivate</button>
            <button onClick={() => bulkAction("DELETE")} className="px-2 py-1 rounded bg-rose-600/20 text-rose-300 hover:bg-rose-600/30">Delete</button>
          </div>
        )}
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-slate-500 border-b border-slate-800">
            <tr className="text-left">
              <th className="py-2 pr-3 w-8"><input type="checkbox" checked={selected.size === sorted.length && sorted.length > 0} onChange={selectAll} /></th>
              <SortHeader label="Agency" k="name" cur={sortBy} dir={sortDir} onClick={() => toggleSort("name")} />
              <th className="py-2 px-3">PCC</th><th className="py-2 px-3">GDS</th>
              <th className="py-2 px-3">Country</th>
              <SortHeader label="Seats" k="seats" cur={sortBy} dir={sortDir} onClick={() => toggleSort("seats")} />
              <th className="py-2 px-3">Status</th>
              <SortHeader label="ADMs" k="adms" cur={sortBy} dir={sortDir} onClick={() => toggleSort("adms")} />
              <SortHeader label="Last Active" k="lastActive" cur={sortBy} dir={sortDir} onClick={() => toggleSort("lastActive")} />
              <th className="py-2 pl-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => {
              const pct = a.seats ? (a.usedSeats / a.seats) * 100 : 0;
              const barColor = pct >= 95 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
              return (
                <tr key={a.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                  <td className="py-3 pr-3"><input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleSelect(a.id)} /></td>
                  <td className="py-3 pr-3">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{a.id} · {a.policyLevel}</div>
                  </td>
                  <td className="py-3 px-3 font-mono">{a.pcc}</td>
                  <td className="py-3 px-3"><span className="px-1.5 py-0.5 rounded bg-slate-800 text-xs">{a.gds}</span></td>
                  <td className="py-3 px-3">{a.country}</td>
                  <td className="py-3 px-3">
                    <div className="text-xs">{a.usedSeats}/{a.seats}</div>
                    <div className="h-1 w-20 bg-slate-800 rounded mt-1 overflow-hidden"><div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} /></div>
                  </td>
                  <td className="py-3 px-3"><StatusBadge s={a.status} /></td>
                  <td className="py-3 px-3">{a.monthAdms}</td>
                  <td className="py-3 px-3 text-xs text-slate-400">{a.lastActive}</td>
                  <td className="py-3 pl-3 text-right space-x-1 whitespace-nowrap">
                    <button onClick={() => toast(`Opening audit for ${a.name}`)} className="text-xs px-2 py-1 rounded hover:bg-slate-700 text-sky-400" title="Audit">📊</button>
                    <button onClick={() => toast.success(`Welcome email resent to ${a.adminEmail}`)} className="text-xs px-2 py-1 rounded hover:bg-slate-700 text-indigo-400" title="Resend welcome">✉</button>
                    <button onClick={() => { setAgencies((arr) => arr.map((x) => x.id === a.id ? { ...x, status: x.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED" } : x)); toast.success("Agency status updated"); }} className="text-xs px-2 py-1 rounded hover:bg-slate-700 text-amber-400">
                      {a.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                    </button>
                    <button onClick={() => { setAgencies((arr) => arr.filter((x) => x.id !== a.id)); toast.success("Agency removed"); }} className="text-xs px-2 py-1 rounded hover:bg-slate-700 text-red-400">Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {showAdd && <ProvisionModal onClose={() => setShowAdd(false)} onCreate={(a) => { setAgencies((arr) => [a, ...arr]); }} />}
    </PageShell>
  );
}

function ProvisionModal({ onClose, onCreate }: { onClose: () => void; onCreate: (a: Agency) => void }) {
  const [step, setStep] = useState<"FORM" | "CONFIRM">("FORM");
  const [draft, setDraft] = useState<Agency | null>(null);
  const [gds, setGds] = useState<Agency["gds"]>("1G");

  // GDS-specific modules
  const allModules = useMemo(() => {
    const base = ["NCP Validator", "DOCS SSR", "ADM Audit Trail", "PNR Watcher", "Voucher Engine"];
    if (gds === "1A") base.push("Amadeus Cryptic Bridge");
    if (gds === "1S") base.push("Sabre Red Connector");
    return base;
  }, [gds]);

  return (
    <Modal title={step === "FORM" ? "Provision New Agency" : "Confirm Provisioning"} onClose={onClose}>
      {step === "FORM" ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const a: Agency = {
              id: `AG-${Math.floor(1000 + Math.random() * 9000)}`,
              name: String(fd.get("name") || "Unnamed"),
              pcc: String(fd.get("pcc") || "XXXX").toUpperCase(),
              gds,
              country: String(fd.get("country") || "ZW"),
              seats: Number(fd.get("seats") || 10),
              usedSeats: 0,
              status: fd.get("mode") === "TRIAL" ? "TRIAL" : "PROVISIONING",
              monthAdms: 0,
              lastActive: "—",
              policyLevel: (fd.get("policy") as Agency["policyLevel"]) || "STANDARD",
              adminEmail: String(fd.get("adminEmail") || ""),
            };
            setDraft(a);
            setStep("CONFIRM");
          }}
        >
          <Field name="name" label="Agency name *" required />
          <div className="grid grid-cols-2 gap-3">
            <Field name="pcc" label="PCC *" required />
            <SelectField name="country" label="Country *" options={COUNTRIES} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">GDS *</label>
              <select value={gds} onChange={(e) => setGds(e.target.value as Agency["gds"])} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm">
                {["1G", "1A", "1S"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <Field name="seats" label="Seat count *" type="number" required />
          </div>
          <Field name="adminEmail" label="Agency administrator email *" type="email" required />
          <p className="text-[11px] text-slate-500 -mt-2">Admin receives credentials and MFA setup link automatically.</p>
          <div className="grid grid-cols-2 gap-3">
            <SelectField name="policy" label="Policy template" options={POLICY_TEMPLATES} />
            <SelectField name="mode" label="Access mode" options={["TRIAL", "FULL"]} />
          </div>
          <div className="text-xs text-slate-400 border border-slate-800 rounded-md p-3">
            <div className="font-semibold mb-1">Policy modules ({gds})</div>
            {allModules.map((m) => (
              <label key={m} className="flex items-center gap-2 py-0.5"><input type="checkbox" defaultChecked /> {m}</label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm rounded-md hover:bg-slate-800">Cancel</button>
            <button type="submit" className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500">Review →</button>
          </div>
        </form>
      ) : draft && (
        <div className="space-y-4">
          <div className="text-sm text-slate-300">You are about to provision:</div>
          <div className="rounded-md border border-slate-800 bg-slate-800/40 p-4 space-y-1 text-sm">
            <div><span className="text-slate-500">Agency:</span> <span className="font-medium">{draft.name}</span></div>
            <div><span className="text-slate-500">GDS / PCC:</span> {draft.gds} · {draft.pcc}</div>
            <div><span className="text-slate-500">Country:</span> {draft.country}</div>
            <div><span className="text-slate-500">Seats:</span> {draft.seats}</div>
            <div><span className="text-slate-500">Mode:</span> {draft.status}</div>
            <div><span className="text-slate-500">Admin:</span> {draft.adminEmail}</div>
            <div><span className="text-slate-500">API key:</span> <span className="font-mono text-emerald-400">ag_live_{Math.random().toString(36).slice(2, 12)}</span></div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setStep("FORM")} className="px-3 py-1.5 text-sm rounded-md hover:bg-slate-800">← Back</button>
            <button onClick={() => {
              onCreate(draft);
              toast.success(`Agency provisioned · welcome email sent to ${draft.adminEmail}`);
              onClose();
            }} className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500">Confirm & Provision</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ============================================================
// Users
// ============================================================
function UsersPanel() {
  const [users, setUsers] = useState<HelpdeskUser[]>(INITIAL_USERS);
  const [showAdd, setShowAdd] = useState(false);
  const [addAnother, setAddAnother] = useState(false);

  const roleHints: Record<string, string> = {
    L1: "Ticket support, view dashboards, respond to clients",
    L2: "Above + Emulate PCC, escalate to vendors, manage vouchers",
    ADMIN: "Full control: provision agencies, manage users, audit trail",
  };

  return (
    <PageShell title="Helpdesk Users" subtitle="Add or remove operator accounts · every sign-on is audited"
      action={<button onClick={() => setShowAdd(true)} className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm font-medium">+ Add User</button>}>
      <Card>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-slate-500 border-b border-slate-800">
            <tr className="text-left">
              <th className="py-2 pr-3">Name</th><th className="py-2 px-3">Email</th>
              <th className="py-2 px-3">Role</th><th className="py-2 px-3">MFA</th>
              <th className="py-2 px-3">Status</th><th className="py-2 px-3">Last Login</th>
              <th className="py-2 pl-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-800/60">
                <td className="py-3 pr-3 font-medium">{u.name}</td>
                <td className="py-3 px-3 text-slate-300">{u.email}</td>
                <td className="py-3 px-3" title={roleHints[u.role]}>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-xs cursor-help">{u.role}</span>
                </td>
                <td className="py-3 px-3">
                  {u.mfa
                    ? <span className="text-emerald-400 text-xs">✓ Enabled</span>
                    : <span className="text-rose-400 text-xs">✗ Disabled</span>}
                </td>
                <td className="py-3 px-3">{u.active ? <span className="text-emerald-400 text-xs">● Active</span> : <span className="text-slate-500 text-xs">● Disabled</span>}</td>
                <td className="py-3 px-3 text-xs text-slate-400">{u.lastLogin}</td>
                <td className="py-3 pl-3 text-right space-x-2">
                  <button onClick={() => toast(`Audit trail for ${u.name} — 142 actions logged`)} className="text-xs px-2 py-1 rounded hover:bg-slate-700 text-sky-400">Audit</button>
                  <button onClick={() => { setUsers((arr) => arr.map((x) => x.id === u.id ? { ...x, active: !x.active } : x)); toast.success("User updated"); }} className="text-xs px-2 py-1 rounded hover:bg-slate-700 text-amber-400">{u.active ? "Disable" : "Enable"}</button>
                  <button onClick={() => { setUsers((arr) => arr.filter((x) => x.id !== u.id)); toast.success("User removed"); }} className="text-xs px-2 py-1 rounded hover:bg-slate-700 text-red-400">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {showAdd && (
        <Modal title="Add Helpdesk User" onClose={() => setShowAdd(false)}>
          <form className="space-y-3" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const email = String(fd.get("email"));
            if (!email.endsWith("@aero-guard.io")) {
              if (!window.confirm("Email is not on @aero-guard.io domain. Continue?")) return;
            }
            setUsers((arr) => [{ id: `U-${Math.floor(Math.random()*99)}`, name: String(fd.get("name")), email, role: fd.get("role") as HelpdeskUser["role"], active: true, mfa: false, lastLogin: "never" }, ...arr]);
            toast.success(`Invitation sent to ${email}`);
            if (addAnother) {
              (e.currentTarget as HTMLFormElement).reset();
            } else {
              setShowAdd(false);
            }
          }}>
            <Field name="name" label="Full name *" required />
            <Field name="email" label="Work email *" type="email" required />
            <p className="text-[11px] text-slate-500 -mt-2">The user will receive an automated invitation to set up their password and MFA.</p>
            <SelectField name="role" label="Role *" options={["L1", "L2", "ADMIN"]} />
            <div className="text-[11px] text-slate-400 border border-slate-800 rounded p-2 space-y-0.5">
              <div><b>L1</b> — {roleHints.L1}</div>
              <div><b>L2</b> — {roleHints.L2}</div>
              <div><b>ADMIN</b> — {roleHints.ADMIN}</div>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={addAnother} onChange={(e) => setAddAnother(e.target.checked)} />
              Invite another user after this one
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm rounded-md hover:bg-slate-800">Cancel</button>
              <button type="submit" className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500">Send Invite</button>
            </div>
          </form>
        </Modal>
      )}
    </PageShell>
  );
}

// ============================================================
// Vouchers
// ============================================================
function VouchersPanel() {
  const [vouchers, setVouchers] = useState<Voucher[]>(INITIAL_VOUCHERS);
  const [search, setSearch] = useState("");
  const [pnrVerified, setPnrVerified] = useState<null | boolean>(null);

  const filtered = vouchers.filter((v) =>
    !search || v.id.includes(search.toUpperCase()) || v.pnr.includes(search.toUpperCase()) || v.pax.includes(search.toUpperCase())
  );

  const exportCsv = () => {
    const headers = ["ID", "Pax", "PNR", "Ticket", "Reason", "Amount", "Currency", "Payment", "Policy", "Status"];
    const rows = vouchers.map((v) => [v.id, v.pax, v.pnr, v.ticket, v.reason, v.amount, v.currency, v.payment, v.policy, v.status]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "vouchers.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported vouchers.csv");
  };

  return (
    <PageShell title="Vouchers" subtitle="Issue compensation for schedule changes, cancellations, ADMs and goodwill"
      action={<button onClick={exportCsv} className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-sm">⬇ Export CSV</button>}>
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3 mb-4 text-xs text-amber-300">
        ⚠ 2 vouchers awaiting approval (&gt; $500) — policy AUTO-FLAG triggered
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Issue Voucher" className="lg:col-span-1">
          <form className="space-y-3" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const amount = Number(fd.get("amount") || 0);
            const v: Voucher = {
              id: `VCH-${Math.floor(10000 + Math.random()*90000)}`,
              pax: String(fd.get("pax") || "").toUpperCase(),
              pnr: String(fd.get("pnr") || "").toUpperCase(),
              ticket: String(fd.get("ticket") || ""),
              reason: String(fd.get("reason") || ""),
              amount,
              currency: String(fd.get("currency") || "USD"),
              payment: String(fd.get("payment") || "REFUND"),
              card: String(fd.get("card") || "—"),
              policy: String(fd.get("policy") || "GOODWILL"),
              status: "ISSUED",
              issued: "just now",
            };
            setVouchers((arr) => [v, ...arr]);
            (e.currentTarget as HTMLFormElement).reset();
            setPnrVerified(null);
            if (amount > 500) toast(`Voucher ${v.id} submitted for approval (>$500)`);
            else toast.success(`Voucher ${v.id} issued to ${v.pax}`);
          }}>
            <Field name="pax" label="Passenger *" required />
            <div className="flex gap-2 items-end">
              <div className="flex-1"><Field name="pnr" label="PNR locator *" required /></div>
              <button type="button" onClick={() => { setPnrVerified(true); toast.success("PNR verified · eligible"); }} className="px-2 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 h-[34px]">Verify</button>
            </div>
            {pnrVerified && <div className="text-[11px] text-emerald-400">✓ PNR confirmed eligible</div>}
            <Field name="ticket" label="Ticket number" />
            <SelectField name="reason" label="Reason *" options={["Schedule change >4h", "Flight cancellation", "ADM dispute", "Goodwill", "IROPS rebooking"]} />
            <SelectField name="policy" label="Policy type" options={["IROPS-A", "IROPS-B", "GOODWILL", "ADM-OFFSET", "LOYALTY"]} />
            <div className="grid grid-cols-2 gap-3">
              <Field name="amount" label="Amount *" type="number" required />
              <SelectField name="currency" label="Currency" options={CURRENCIES} />
            </div>
            <SelectField name="payment" label="Payment method" options={["REFUND", "VOUCHER", "CREDIT NOTE", "CASH", "TRANSFER"]} />
            <Field name="card" label="Card / account (last 4)" />
            <button type="submit" className="w-full px-3 py-2 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500">Issue Voucher</button>
          </form>
        </Card>

        <Card title="Recent Vouchers" className="lg:col-span-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID, PNR, or passenger…" className="w-full mb-3 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm" />
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 border-b border-slate-800">
              <tr className="text-left">
                <th className="py-2 pr-3">ID</th><th className="py-2 px-3">Pax / PNR</th>
                <th className="py-2 px-3">Reason</th><th className="py-2 px-3">Policy</th>
                <th className="py-2 px-3">Status</th><th className="py-2 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-slate-800/60">
                  <td className="py-2 pr-3 font-mono text-xs">{v.id}</td>
                  <td className="py-2 px-3">
                    <div>{v.pax}</div>
                    <div className="text-xs text-slate-500 font-mono">{v.pnr}</div>
                  </td>
                  <td className="py-2 px-3 text-slate-400">{v.reason}</td>
                  <td className="py-2 px-3 text-xs">{v.policy}</td>
                  <td className="py-2 px-3"><VoucherStatusBadge s={v.status} /></td>
                  <td className="py-2 px-3 text-right">{v.currency} {v.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </PageShell>
  );
}

// ============================================================
// Audits (AAA)
// ============================================================
function AuditsPanel() {
  const [range, setRange] = useState<"DAY" | "WEEK" | "MONTH">("WEEK");
  const [filterAgency, setFilterAgency] = useState("ALL");
  const [sortHealth, setSortHealth] = useState(false);
  const [drill, setDrill] = useState<string | null>(null);

  const rows = useMemo(() => {
    const base = INITIAL_AGENCIES
      .filter((a) => filterAgency === "ALL" || a.name === filterAgency)
      .map((a) => ({
        agency: a.name, pcc: a.pcc, adms: a.monthAdms,
        saved: a.monthAdms * 1800 + 4000,
        lost: a.monthAdms * 400,
        health: a.monthAdms > 10 ? "AT RISK" : a.monthAdms > 3 ? "WATCH" : "HEALTHY",
        trend: a.monthAdms > 5 ? "↑" : "↓",
      }));
    if (sortHealth) {
      const order: Record<string, number> = { "AT RISK": 0, WATCH: 1, HEALTHY: 2 };
      base.sort((a, b) => order[a.health] - order[b.health]);
    }
    return base;
  }, [filterAgency, sortHealth]);

  const reasonDist = [
    { label: "Duplicate booking", pct: 32, color: "bg-rose-500" },
    { label: "Fare rule violation", pct: 24, color: "bg-amber-500" },
    { label: "Time limit expiry", pct: 18, color: "bg-indigo-500" },
    { label: "Schedule change", pct: 14, color: "bg-sky-500" },
    { label: "Other", pct: 12, color: "bg-slate-500" },
  ];

  return (
    <PageShell title="Agency ADM Audits (AAA)" subtitle="Track airline debit memos by agency, period and liability">
      <div className="flex flex-wrap gap-2 mb-4">
        {(["DAY", "WEEK", "MONTH"] as const).map((r) => (
          <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 text-xs rounded-md ${range === r ? "bg-indigo-600" : "bg-slate-800 hover:bg-slate-700"}`}>{r}</button>
        ))}
        <div className="ml-auto">
          <FilterSelect label="Agency" value={filterAgency} onChange={setFilterAgency} options={["ALL", ...INITIAL_AGENCIES.map((a) => a.name)]} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Stat label="ADMs this period" value="23" tone="amber" sub="↓ 12% vs prev" />
        <Stat label="Amount saved" value="$68,400" tone="emerald" sub="↑ 18% vs prev" />
        <Stat label="Amount lost" value="$13,920" tone="rose" sub="↓ 6% vs prev" />
        <Stat label="Potential savings" value="$22,300" tone="sky" sub="if 100% compliant" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card title="ADM Reason Distribution" className="lg:col-span-1">
          <ul className="space-y-2">
            {reasonDist.map((r) => (
              <li key={r.label}>
                <div className="flex justify-between text-xs"><span>{r.label}</span><span className="text-slate-400">{r.pct}%</span></div>
                <div className="h-1.5 bg-slate-800 rounded mt-1 overflow-hidden"><div className={`h-full ${r.color}`} style={{ width: `${r.pct}%` }} /></div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Per-agency breakdown" className="lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 border-b border-slate-800">
              <tr className="text-left">
                <th className="py-2 pr-3">Agency</th><th className="py-2 px-3">ADMs</th>
                <th className="py-2 px-3">Saved</th><th className="py-2 px-3">Lost</th>
                <th className="py-2 px-3 cursor-pointer hover:text-indigo-300" onClick={() => setSortHealth(!sortHealth)}>Health {sortHealth ? "▼" : "▽"}</th>
                <th className="py-2 px-3">Trend</th><th className="py-2 pl-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.agency} className="border-b border-slate-800/60">
                  <td className="py-3 pr-3">
                    <button onClick={() => setDrill(r.agency)} className="font-medium text-indigo-300 hover:underline text-left">{r.agency}</button>
                    <div className="text-xs text-slate-500 font-mono">{r.pcc}</div>
                  </td>
                  <td className="py-3 px-3">{r.adms}</td>
                  <td className="py-3 px-3 text-emerald-400">${r.saved.toLocaleString()}</td>
                  <td className="py-3 px-3 text-rose-400">${r.lost.toLocaleString()}</td>
                  <td className="py-3 px-3"><HealthBadge h={r.health} /></td>
                  <td className="py-3 px-3 text-sm">{r.trend}</td>
                  <td className="py-3 pl-3 text-right">
                    <button onClick={() => toast.success(`Compliance report sent to ${r.agency}`)} className="text-xs px-2 py-1 rounded bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30">Send Report</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {drill && (
        <Modal title={`Drill-down · ${drill}`} onClose={() => setDrill(null)}>
          <div className="space-y-3 text-sm">
            <div className="text-xs text-slate-400">Top triggering rules ({range.toLowerCase()})</div>
            <ul className="space-y-2">
              <li className="p-2 rounded bg-slate-800/60 border border-slate-800"><span className="font-mono text-xs text-amber-400">FXR-103</span> Fare basis mismatch · 4 PNRs · est $1,600</li>
              <li className="p-2 rounded bg-slate-800/60 border border-slate-800"><span className="font-mono text-xs text-rose-400">TKT-204</span> Ticketing time limit expired · 2 PNRs · est $800</li>
              <li className="p-2 rounded bg-slate-800/60 border border-slate-800"><span className="font-mono text-xs text-indigo-400">NCP-011</span> Name change post-ticketing · 1 PNR · est $320</li>
            </ul>
          </div>
        </Modal>
      )}
    </PageShell>
  );
}

// ============================================================
// Escalations
// ============================================================
function EscalationsPanel() {
  const [escs, setEscs] = useState<Escalation[]>(INITIAL_ESCALATIONS);
  const [showNew, setShowNew] = useState(false);
  const [escalateTarget, setEscalateTarget] = useState<{ esc: Escalation; to: "L2" | "VENDOR" } | null>(null);

  const updateStatus = (id: string, status: Escalation["status"]) => {
    setEscs((arr) => arr.map((e) => e.id === id ? { ...e, status } : e));
    toast.success(`Status updated → ${status}`);
  };

  return (
    <PageShell title="Escalations" subtitle="Route cases to L2, Jometech Africa or vendor support · every action is audited"
      action={<button onClick={() => setShowNew(true)} className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm font-medium">+ New Escalation</button>}>
      <Card>
        <ul className="divide-y divide-slate-800">
          {escs.map((e) => (
            <li key={e.id} className="py-4 flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                  <span className="font-mono">{e.id}</span><span>·</span>
                  <span>{e.agency}</span><span>·</span>
                  <span>PNR {e.pnr}</span><span>·</span>
                  <span>{e.opened}</span>
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 text-[10px]">SLA: {e.sla}</span>
                </div>
                <div className="text-sm mt-1">{e.subject}</div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <PriorityBadge p={e.priority} />
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-xs">Current: {e.level}</span>
                  <EscStatusBadge s={e.status} />
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => setEscalateTarget({ esc: e, to: "L2" })} className="text-xs px-3 py-1.5 rounded bg-amber-600/20 text-amber-300 hover:bg-amber-600/30">→ L2 Jometech</button>
                <button onClick={() => setEscalateTarget({ esc: e, to: "VENDOR" })} className="text-xs px-3 py-1.5 rounded bg-rose-600/20 text-rose-300 hover:bg-rose-600/30">→ GDS Vendor</button>
                <button onClick={() => updateStatus(e.id, "RESOLVED")} className="text-xs px-3 py-1.5 rounded bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30">✓ Resolved</button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {escalateTarget && (
        <Modal title={`Escalate ${escalateTarget.esc.id} → ${escalateTarget.to === "L2" ? "L2 Jometech" : "GDS Vendor"}`} onClose={() => setEscalateTarget(null)}>
          <form className="space-y-3" onSubmit={(e) => {
            e.preventDefault();
            updateStatus(escalateTarget.esc.id, "PENDING");
            setEscs((arr) => arr.map((x) => x.id === escalateTarget.esc.id ? { ...x, level: escalateTarget.to } : x));
            toast.success(`Escalated to ${escalateTarget.to}`);
            setEscalateTarget(null);
          }}>
            <div className="text-xs text-slate-400 border border-slate-800 rounded p-2">
              Confirm escalation of <b>{escalateTarget.esc.id}</b> ({escalateTarget.esc.agency}) to <b>{escalateTarget.to}</b>. This will be logged in the audit trail.
            </div>
            <div>
              <label className="text-xs text-slate-400">Reason for escalation *</label>
              <textarea required name="reason" rows={3} placeholder="Provide context so the receiving team can act immediately…" className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm" />
            </div>
            <Field name="cc" label="CC helpdesk / agency (comma-separated emails)" />
            <div>
              <label className="text-xs text-slate-400">Attach screenshot / evidence</label>
              <input type="file" accept="image/*" className="w-full mt-1 text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-slate-200" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEscalateTarget(null)} className="px-3 py-1.5 text-sm rounded-md hover:bg-slate-800">Cancel</button>
              <button type="submit" className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500">Confirm Escalation</button>
            </div>
          </form>
        </Modal>
      )}

      {showNew && (
        <Modal title="New Escalation" onClose={() => setShowNew(false)}>
          <form className="space-y-3" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const next: Escalation = {
              id: `ESC-${Math.floor(7000 + Math.random()*999)}`,
              agency: String(fd.get("agency") || "All agencies"),
              pnr: String(fd.get("pnr") || "—").toUpperCase(),
              subject: String(fd.get("subject") || ""),
              level: "L1", priority: (fd.get("priority") as Escalation["priority"]) || "MED",
              opened: "just now", status: "OPEN", sla: "24 hr left",
            };
            setEscs((arr) => [next, ...arr]);
            toast.success("Escalation created");
            setShowNew(false);
          }}>
            <SelectField name="agency" label="Agency affected" options={["All agencies (override)", ...INITIAL_AGENCIES.map((a) => a.name)]} />
            <Field name="pnr" label="PNR affected" />
            <Field name="subject" label="Subject *" required />
            <SelectField name="priority" label="Priority" options={["LOW", "MED", "HIGH"]} />
            <div>
              <label className="text-xs text-slate-400">Attach image</label>
              <input type="file" accept="image/*" className="w-full mt-1 text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-slate-200" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowNew(false)} className="px-3 py-1.5 text-sm rounded-md hover:bg-slate-800">Cancel</button>
              <button type="submit" className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500">Create</button>
            </div>
          </form>
        </Modal>
      )}
    </PageShell>
  );
}

// ============================================================
// Emulate PCC
// ============================================================
function EmulatePanel() {
  const [pcc, setPcc] = useState("7XQ9");
  const [connected, setConnected] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [cmd, setCmd] = useState("");
  const [reason, setReason] = useState("");

  const connect = () => {
    if (!reason.trim()) { toast.error("Audit reason required before emulation"); return; }
    setConnected(true);
    setHistory([`>> EMULATE ${pcc} — operator: SMOYO — reason: ${reason}`, "<< Connected to 1G host AP-2", "<< Session audited (TKT-AUD-9921)"]);
    toast.success(`Emulating into PCC ${pcc} — logged`);
  };
  const run = () => {
    if (!cmd.trim()) return;
    const out = cmd.startsWith("*R") ? "RLOC X7K2QP / 2 PAX / QR084 23JUN DOH HRE" : cmd.startsWith("FXX") ? "FARE QUOTE: USD 842.00 / TAX 138.00 / TOTAL 980.00" : "OK";
    setHistory((h) => [...h, `> ${cmd}`, `  ${out}`]);
    setCmd("");
  };

  return (
    <PageShell title="Emulate into PCC" subtitle="Audited terminal access — every keystroke logged">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Session" className="lg:col-span-1">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400">Target PCC</label>
              <input value={pcc} onChange={(e) => setPcc(e.target.value.toUpperCase())} disabled={connected} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Audit reason (required)</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} disabled={connected} rows={3} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm" placeholder="e.g. Assisting Skylink with PNR X7K2QP rebook" />
            </div>
            {!connected ? (
              <button onClick={connect} className="w-full px-3 py-2 text-sm rounded bg-emerald-600 hover:bg-emerald-500">Connect</button>
            ) : (
              <button onClick={() => { setConnected(false); setHistory([]); toast("Session closed — audit saved"); }} className="w-full px-3 py-2 text-sm rounded bg-rose-600 hover:bg-rose-500">Disconnect</button>
            )}
            <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-3">
              🔒 Every emulation logs: operator, PCC, reason, commands, timestamps. Auditing the auditors.
            </div>
          </div>
        </Card>

        <Card title={connected ? `Terminal · ${pcc}` : "Terminal · disconnected"} className="lg:col-span-2">
          <div className="font-mono text-xs bg-black border border-slate-800 rounded-md p-3 h-80 overflow-auto">
            {history.length === 0 && <div className="text-slate-600">No active session.</div>}
            {history.map((l, i) => (
              <div key={i} className={l.startsWith(">") ? "text-emerald-400" : l.startsWith("<<") ? "text-sky-400" : "text-slate-300"}>{l}</div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <span className="font-mono text-emerald-400 self-center">$</span>
            <input value={cmd} onChange={(e) => setCmd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} disabled={!connected} placeholder={connected ? "*R, FXX, I…" : "Connect to begin"} className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm font-mono disabled:opacity-50" />
            <button onClick={run} disabled={!connected} className="px-3 py-1.5 text-sm rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50">Send</button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

// ============================================================
// Respond
// ============================================================
type Thread = { id: string; agency: string; agent: string; last: string; unread: number; messages: { from: "AGENT" | "OPS"; text: string; t: string }[] };
const THREADS: Thread[] = [
  { id: "T-91", agency: "Skylink Travel", agent: "Rumbi", last: "Need help on a DOCS SSR reject", unread: 2, messages: [
    { from: "AGENT", text: "DOCS SSR keeps rejecting — passport name has hyphen", t: "14:01" },
    { from: "AGENT", text: "Need help on a DOCS SSR reject", t: "14:02" },
  ]},
  { id: "T-90", agency: "Voyage Africa", agent: "Tendai", last: "Voucher not received by pax", unread: 0, messages: [
    { from: "AGENT", text: "Voucher VCH-44021 not received by pax", t: "13:30" },
    { from: "OPS", text: "Resent — please confirm", t: "13:35" },
  ]},
];

function RespondPanel() {
  const [active, setActive] = useState<string>(THREADS[0].id);
  const [draft, setDraft] = useState("");
  const thread = THREADS.find((t) => t.id === active)!;

  return (
    <PageShell title="Respond to Clients" subtitle="Chat, call back, or send a demo video">
      <div className="grid grid-cols-12 gap-0 border border-slate-800 rounded-lg overflow-hidden bg-slate-900">
        <div className="col-span-4 border-r border-slate-800 max-h-[600px] overflow-auto">
          {THREADS.map((t) => (
            <button key={t.id} onClick={() => setActive(t.id)} className={`w-full text-left p-3 border-b border-slate-800 hover:bg-slate-800/60 ${active === t.id ? "bg-slate-800/80" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{t.agency}</div>
                {t.unread > 0 && <span className="bg-rose-500 text-white text-[10px] px-1.5 rounded-full">{t.unread}</span>}
              </div>
              <div className="text-xs text-slate-500">{t.agent}</div>
              <div className="text-xs text-slate-400 truncate mt-1">{t.last}</div>
            </button>
          ))}
        </div>

        <div className="col-span-8 grid grid-cols-12">
          <div className="col-span-8 p-4 flex flex-col h-[600px]">
            <div className="text-xs text-slate-400 pb-3 border-b border-slate-800">
              <span className="font-semibold text-slate-200">{thread.agency}</span> · agent {thread.agent} · ticket {thread.id}
            </div>
            <div className="flex-1 overflow-auto py-4 space-y-3">
              {thread.messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === "OPS" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.from === "OPS" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-100"}`}>
                    <div>{m.text}</div>
                    <div className="text-[10px] opacity-60 mt-0.5">{m.t}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-3 border-t border-slate-800">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a reply…" className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" />
              <button onClick={() => { if (!draft.trim()) return; thread.messages.push({ from: "OPS", text: draft, t: "now" }); setDraft(""); toast.success("Reply sent"); }} className="px-4 py-2 text-sm rounded bg-indigo-600 hover:bg-indigo-500">Send</button>
            </div>
          </div>

          <div className="col-span-4 p-4 border-l border-slate-800 bg-slate-950/40 space-y-2">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Response tools</div>
            <ToolBtn icon="⚡" label="Quick Audit PNR" onClick={() => toast.success("PNR audit · compliant")} />
            <ToolBtn icon="📹" label="Send demo video" onClick={() => toast.success("Demo video link sent")} />
            <ToolBtn icon="📞" label="Call back agent" onClick={() => toast("Dialing…")} />
            <ToolBtn icon="📧" label="Email transcript" onClick={() => toast.success("Transcript emailed")} />
            <ToolBtn icon="⌨" label="Emulate their PCC" onClick={() => toast("Opening PCC session…")} />
            <ToolBtn icon="⬆" label="Escalate to L2" onClick={() => toast.success("Escalated to L2")} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// ============================================================
// Learning & Policies
// ============================================================
function LearningPanel() {
  const modules = [
    { name: "NCP Validator Fundamentals", progress: 100, badge: "✓ Done" },
    { name: "DOCS SSR Edge Cases", progress: 75, badge: "In progress" },
    { name: "NDC Order Management", progress: 60, badge: "In progress" },
    { name: "ADM Dispute Mastery", progress: 0, badge: "Not started" },
  ];
  return (
    <PageShell title="My Learning" subtitle="Helpdesk certification & compliance training">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((m) => (
          <Card key={m.name}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-slate-400 mt-1">{m.badge}</div>
              </div>
              <span className="text-xs font-mono text-slate-400">{m.progress}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded mt-3 overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${m.progress}%` }} /></div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

function PoliciesPanel() {
  const docs = [
    { cat: "GDS", name: "Galileo 1G Terms of Use", v: "2025.06" },
    { cat: "GDS", name: "Amadeus 1A Agreement", v: "2025.04" },
    { cat: "NDC", name: "NDC Distribution Agreement", v: "v21" },
    { cat: "OTA", name: "OTA Connectivity Standards", v: "2024.11" },
    { cat: "AERO-GUARD", name: "Acceptable Use Policy", v: "2025.05" },
    { cat: "AERO-GUARD", name: "Data Processing Addendum", v: "2025.02" },
  ];
  return (
    <PageShell title="Terms, Policies & Products" subtitle="GDS · NDC · OTA agreements and AERO-GUARD policy library">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docs.map((d) => (
          <Card key={d.name}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500">{d.cat}</div>
                <div className="font-medium mt-0.5">{d.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">Version {d.v}</div>
              </div>
              <button className="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700">Open</button>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

// ============================================================
// Shared atoms
// ============================================================
function PageShell({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Card({ title, subtitle, children, className = "" }: { title?: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-lg p-5 ${className}`}>
      {title && (
        <div className="mb-4">
          <div className="text-sm font-semibold">{title}</div>
          {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function Stat({ label, value, tone, sub }: { label: string; value: string; tone: "emerald" | "indigo" | "amber" | "sky" | "rose"; sub?: string }) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-400 border-emerald-500/30",
    indigo: "text-indigo-400 border-indigo-500/30",
    amber: "text-amber-400 border-amber-500/30",
    sky: "text-sky-400 border-sky-500/30",
    rose: "text-rose-400 border-rose-500/30",
  };
  return (
    <div className={`rounded-lg bg-slate-900/60 border ${tones[tone]} p-4`}>
      <div className="text-[11px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${tones[tone].split(" ")[0]}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function SeverityDot({ s }: { s: "INFO" | "WARN" | "CRIT" }) {
  const c = s === "CRIT" ? "bg-rose-500" : s === "WARN" ? "bg-amber-500" : "bg-sky-500";
  return <span className={`w-2 h-2 rounded-full ${c} mt-1.5 shrink-0`} />;
}

function StatusBadge({ s }: { s: Agency["status"] }) {
  const map: Record<Agency["status"], string> = {
    ACTIVE: "bg-emerald-500/15 text-emerald-400",
    SUSPENDED: "bg-rose-500/15 text-rose-400",
    PROVISIONING: "bg-sky-500/15 text-sky-400",
    TRIAL: "bg-amber-500/15 text-amber-400",
    ARCHIVED: "bg-slate-700/40 text-slate-400",
  };
  return <span className={`px-1.5 py-0.5 rounded text-[11px] ${map[s]}`}>{s}</span>;
}

function VoucherStatusBadge({ s }: { s: Voucher["status"] }) {
  const map: Record<Voucher["status"], string> = {
    ISSUED: "bg-emerald-500/15 text-emerald-400",
    REDEEMED: "bg-sky-500/15 text-sky-400",
    EXPIRED: "bg-slate-700 text-slate-400",
    VOID: "bg-rose-500/15 text-rose-400",
  };
  return <span className={`px-1.5 py-0.5 rounded text-[10px] ${map[s]}`}>{s}</span>;
}

function EscStatusBadge({ s }: { s: Escalation["status"] }) {
  const map: Record<Escalation["status"], string> = {
    OPEN: "bg-sky-500/15 text-sky-400",
    PENDING: "bg-amber-500/15 text-amber-400",
    RESOLVED: "bg-emerald-500/15 text-emerald-400",
  };
  return <span className={`px-1.5 py-0.5 rounded text-[10px] ${map[s]}`}>{s}</span>;
}

function PriorityBadge({ p }: { p: Escalation["priority"] }) {
  const map = { HIGH: "bg-rose-500/15 text-rose-400", MED: "bg-amber-500/15 text-amber-400", LOW: "bg-slate-700 text-slate-300" };
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${map[p]}`}>{p}</span>;
}

function HealthBadge({ h }: { h: string }) {
  const map: Record<string, string> = { HEALTHY: "bg-emerald-500/15 text-emerald-400", WATCH: "bg-amber-500/15 text-amber-400", "AT RISK": "bg-rose-500/15 text-rose-400" };
  return <span className={`px-1.5 py-0.5 rounded text-[11px] ${map[h]}`}>{h}</span>;
}

function QuickAction({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-4 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 transition text-left">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-medium">{label}</div>
    </button>
  );
}

function ToolBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm bg-slate-800/60 hover:bg-slate-800 border border-slate-800">
      <span>{icon}</span><span>{label}</span>
    </button>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  // Full-screen takeover (Travelport-style): sidebar stays visible at left, the
  // entire main work area is replaced with this workspace.
  return (
    <div className="fixed inset-0 left-0 md:left-64 top-14 z-40 bg-slate-950 overflow-auto">
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm flex items-center gap-1">← Back</button>
          <span className="text-slate-700">/</span>
          <div className="font-semibold text-sm">{title}</div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none" aria-label="Close">×</button>
      </div>
      <div className="max-w-5xl mx-auto p-6 md:p-10">{children}</div>
    </div>
  );
}

function Field({ name, label, type = "text", required }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-xs text-slate-400">{label}</label>
      <input name={name} type={type} required={required} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500" />
    </div>
  );
}

function SelectField({ name, label, options }: { name: string; label: string; options: string[] }) {
  return (
    <div>
      <label className="text-xs text-slate-400">{label}</label>
      <select name={name} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-slate-400">
      <span>{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function SortHeader({ label, k, cur, dir, onClick }: { label: string; k: SortKey; cur: SortKey; dir: "asc" | "desc"; onClick: () => void }) {
  const active = cur === k;
  return (
    <th onClick={onClick} className="py-2 px-3 cursor-pointer select-none hover:text-indigo-300">
      {label} {active ? (dir === "asc" ? "↑" : "↓") : <span className="text-slate-700">↕</span>}
    </th>
  );
}
