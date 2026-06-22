// Fake GDS / agency data used until the Express API is wired up for real.

export const agencies = [
  { id: 1, name: "Skyline Travel", pcc: "PCC001", status: "active", createdAt: "2026-05-01" },
  { id: 2, name: "Horizon Voyages", pcc: "PCC002", status: "active", createdAt: "2026-05-03" },
  { id: 3, name: "Continental Tours", pcc: "PCC003", status: "active", createdAt: "2026-05-10" },
];

export const consultants = [
  { id: 4, name: "Lucy Wanjiru", agencyId: 1 },
  { id: 5, name: "Brian Kiptoo", agencyId: 2 },
  { id: 6, name: "Mary Achieng", agencyId: 1 },
  { id: 7, name: "Tom Mutua", agencyId: 3 },
];

const violationTypes = [
  "Fare expiry",
  "Schedule change unactioned",
  "Queue not cleared (HX)",
  "Ticketing time limit",
];
const severities = ["low", "medium", "high", "critical"];
const violationStatuses = ["open", "acknowledged", "resolved"];

export const violations = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  agencyId: agencies[i % agencies.length].id,
  consultant: consultants[i % consultants.length].name,
  pnr: `PNR${1000 + i}`,
  type: violationTypes[i % violationTypes.length],
  severity: severities[i % severities.length],
  status: violationStatuses[i % violationStatuses.length],
  createdAt: `2026-06-${String((i % 28) + 1).padStart(2, "0")}`,
}));

const admReasons = ["Fare rules violation", "Schedule change ADM", "Name correction fee", "No-show ADM"];
const admStatuses = ["received", "disputed", "waived", "potential"];
const liableParties = ["Consultant", "Agency", "Airline", "Client"];

export const admAudits = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  agencyId: agencies[i % agencies.length].id,
  consultant: consultants[i % consultants.length].name,
  pnr: `PNR${2000 + i}`,
  reason: admReasons[i % admReasons.length],
  amount: Math.round((50 + i * 17.3) * 100) / 100,
  liableParty: liableParties[i % liableParties.length],
  status: admStatuses[i % admStatuses.length],
  createdAt: `2026-05-${String((i % 28) + 1).padStart(2, "0")}`,
}));

const voucherReasons = ["Flight cancellation", "Schedule change", "ADM goodwill"];
const clients = ["John Doe", "Amina Yusuf", "Peter Nyongo", "Grace Wambui"];

export const vouchers = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  agencyId: agencies[i % agencies.length].id,
  clientName: clients[i % clients.length],
  pnr: `PNR${3000 + i}`,
  reason: voucherReasons[i % voucherReasons.length],
  amount: Math.round((20 + i * 35.5) * 100) / 100,
  issuedBy: "Aero Guard HQ",
  createdAt: `2026-06-${String((i % 20) + 1).padStart(2, "0")}`,
}));

export const helpdeskMessages = [
  { id: 1, agencyId: 1, sender: "Lucy Wanjiru", senderRole: "consultant", message: "Need help with an HX queue on PNR1004.", createdAt: "2026-06-15 09:12" },
  { id: 2, agencyId: 1, sender: "Aero Guard HQ", senderRole: "provider", message: "Looking into it now, stand by.", createdAt: "2026-06-15 09:20" },
];

export const users = [
  { id: 1, username: "provider", role: "provider", fullName: "Aero Guard HQ", agencyId: null },
  { id: 2, username: "manager1", role: "manager", fullName: "Jane Mwangi", agencyId: 1 },
  { id: 3, username: "helpdesk1", role: "helpdesk", fullName: "Sam Otieno", agencyId: null },
  { id: 4, username: "consultant1", role: "consultant", fullName: "Lucy Wanjiru", agencyId: 1 },
  { id: 5, username: "consultant2", role: "consultant", fullName: "Brian Kiptoo", agencyId: 2 },
];

export function metricsFor(agencyId = null) {
  const scoped = (rows) => (agencyId ? rows.filter((r) => r.agencyId === agencyId) : rows);
  const v = scoped(violations);
  const a = scoped(admAudits);
  return {
    openViolations: v.filter((x) => x.status === "open").length,
    criticalViolations: v.filter((x) => x.severity === "critical").length,
    totalAdmExposure: a.reduce((sum, x) => sum + x.amount, 0),
    disputedAdms: a.filter((x) => x.status === "disputed").length,
    activeAgencies: agencies.filter((x) => x.status === "active").length,
  };
}
