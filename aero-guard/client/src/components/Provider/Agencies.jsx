import { useState } from "react";
import DataTable from "../Shared/DataTable.jsx";
import Badge from "../Shared/Badge.jsx";
import { agencies as seedAgencies } from "../../data/mockData.js";

const columns = [
  { key: "name", label: "Agency" },
  { key: "pcc", label: "PCC" },
  { key: "status", label: "Status", render: (row) => <Badge label={row.status} /> },
  { key: "createdAt", label: "Onboarded" },
];

export default function Agencies() {
  const [agencies, setAgencies] = useState(seedAgencies);
  const [form, setForm] = useState({ name: "", pcc: "" });

  function addAgency(e) {
    e.preventDefault();
    if (!form.name || !form.pcc) return;
    setAgencies((prev) => [
      ...prev,
      { id: prev.length + 1, name: form.name, pcc: form.pcc, status: "active", createdAt: new Date().toISOString().slice(0, 10) },
    ]);
    setForm({ name: "", pcc: "" });
  }

  return (
    <div className="page">
      <h1>Agency Provisioning</h1>
      <form className="inline-form" onSubmit={addAgency}>
        <input
          placeholder="Agency name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="PCC"
          value={form.pcc}
          onChange={(e) => setForm({ ...form, pcc: e.target.value })}
        />
        <button type="submit">Add agency</button>
      </form>
      <DataTable columns={columns} rows={agencies} />
    </div>
  );
}
