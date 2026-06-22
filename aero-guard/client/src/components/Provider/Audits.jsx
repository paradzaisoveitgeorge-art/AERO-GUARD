import DataTable from "../Shared/DataTable.jsx";
import Badge from "../Shared/Badge.jsx";
import MetricCard from "../Shared/MetricCard.jsx";
import { admAudits, agencies } from "../../data/mockData.js";

const agencyName = (id) => agencies.find((a) => a.id === id)?.name ?? "—";

const columns = [
  { key: "pnr", label: "PNR" },
  { key: "agency", label: "Agency", render: (row) => agencyName(row.agencyId) },
  { key: "consultant", label: "Consultant" },
  { key: "reason", label: "Reason" },
  { key: "amount", label: "Amount", render: (row) => `$${row.amount.toFixed(2)}` },
  { key: "liableParty", label: "Liable Party" },
  { key: "status", label: "Status", render: (row) => <Badge label={row.status} /> },
  { key: "createdAt", label: "Date" },
];

export default function Audits() {
  const total = admAudits.reduce((sum, a) => sum + a.amount, 0);
  const disputed = admAudits.filter((a) => a.status === "disputed").length;
  const waived = admAudits.filter((a) => a.status === "waived").length;

  return (
    <div className="page">
      <h1>ADM Audit Suite</h1>
      <div className="metric-grid">
        <MetricCard label="Total Exposure" value={`$${total.toFixed(2)}`} />
        <MetricCard label="Disputed" value={disputed} />
        <MetricCard label="Waived" value={waived} />
      </div>
      <DataTable columns={columns} rows={admAudits} />
    </div>
  );
}
