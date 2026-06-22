import DataTable from "../Shared/DataTable.jsx";
import Badge from "../Shared/Badge.jsx";
import { violations } from "../../data/mockData.js";

const CURRENT_CONSULTANT = "Lucy Wanjiru";

const columns = [
  { key: "pnr", label: "PNR" },
  { key: "type", label: "Type" },
  { key: "severity", label: "Severity", render: (row) => <Badge label={row.severity} /> },
  { key: "status", label: "Status", render: (row) => <Badge label={row.status} /> },
  { key: "createdAt", label: "Date" },
];

export default function Alerts() {
  const rows = violations.filter((v) => v.consultant === CURRENT_CONSULTANT);
  return (
    <div className="page">
      <h1>My Violation Alerts</h1>
      <DataTable columns={columns} rows={rows} emptyText="No violations on your account. Nice work!" />
    </div>
  );
}
