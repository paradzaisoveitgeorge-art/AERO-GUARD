import MetricCard from "../Shared/MetricCard.jsx";
import DataTable from "../Shared/DataTable.jsx";
import Badge from "../Shared/Badge.jsx";
import { admAudits } from "../../data/mockData.js";

const CURRENT_CONSULTANT = "Lucy Wanjiru";

const columns = [
  { key: "pnr", label: "PNR" },
  { key: "reason", label: "Reason" },
  { key: "amount", label: "Amount", render: (row) => `$${row.amount.toFixed(2)}` },
  { key: "status", label: "Status", render: (row) => <Badge label={row.status} /> },
  { key: "createdAt", label: "Date" },
];

export default function MyStats() {
  const mine = admAudits.filter((a) => a.consultant === CURRENT_CONSULTANT);
  const total = mine.reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="page">
      <h1>My ADM Dashboard</h1>
      <div className="metric-grid">
        <MetricCard label="My ADM Exposure" value={`$${total.toFixed(2)}`} />
        <MetricCard label="Total ADMs" value={mine.length} />
      </div>
      <DataTable columns={columns} rows={mine} />
    </div>
  );
}
