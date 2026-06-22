// In-memory dataset shared by all routes. Mirrors the schema used by the
// original Streamlit prototype (agencies, violations, adm_audits, vouchers).

export const agencies = [
  { id: 1, name: "Skyline Travel", pcc: "PCC001", status: "active", createdAt: "2026-05-01" },
  { id: 2, name: "Horizon Voyages", pcc: "PCC002", status: "active", createdAt: "2026-05-03" },
  { id: 3, name: "Continental Tours", pcc: "PCC003", status: "active", createdAt: "2026-05-10" },
];

const violationTypes = ["Fare expiry", "Schedule change unactioned", "Queue not cleared (HX)", "Ticketing time limit"];
const severities = ["low", "medium", "high", "critical"];
const violationStatuses = ["open", "acknowledged", "resolved"];
const consultants = ["Lucy Wanjiru", "Brian Kiptoo", "Mary Achieng", "Tom Mutua"];

export const violations = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  agencyId: agencies[i % agencies.length].id,
  consultant: consultants[i % consultants.length],
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
  consultant: consultants[i % consultants.length],
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

if (process.argv[1]?.endsWith("seed.js")) {
  console.log(`Seeded ${agencies.length} agencies, ${violations.length} violations, ${admAudits.length} ADM audits, ${vouchers.length} vouchers.`);
}
