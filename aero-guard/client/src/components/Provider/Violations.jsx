import { useState } from "react";
import DataTable from "../Shared/DataTable.jsx";
import Badge from "../Shared/Badge.jsx";
import { violations, agencies } from "../../data/mockData.js";

const agencyName = (id) => agencies.find((a) => a.id === id)?.name ?? "—";

const columns = [
  { key: "pnr", label: "PNR" },
  { key: "agency", label: "Agency", render: (row) => agencyName(row.agencyId) },
  { key: "consultant", label: "Consultant" },
  { key: "type", label: "Type" },
  { key: "severity", label: "Severity", render: (row) => <Badge label={row.severity} /> },
  { key: "status", label: "Status", render: (row) => <Badge label={row.status} /> },
  { key: "createdAt", label: "Date" },
];

export default function Violations() {
  const [filter, setFilter] = useState("all");
  const rows = filter === "all" ? violations : violations.filter((v) => v.status === filter);

  return (
    <div className="page">
      <h1>Real-Time Violation Log</h1>
      <div className="filter-bar">
        {["all", "open", "acknowledged", "resolved"].map((status) => (
          <button
            key={status}
            className={filter === status ? "active" : ""}
            onClick={() => setFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>
      <DataTable columns={columns} rows={rows} />
    </div>
  );
}
