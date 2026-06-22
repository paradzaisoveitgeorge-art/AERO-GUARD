import DataTable from "../Shared/DataTable.jsx";
import { vouchers, agencies } from "../../data/mockData.js";

const agencyName = (id) => agencies.find((a) => a.id === id)?.name ?? "—";

const columns = [
  { key: "pnr", label: "PNR" },
  { key: "clientName", label: "Client" },
  { key: "agency", label: "Agency", render: (row) => agencyName(row.agencyId) },
  { key: "reason", label: "Reason" },
  { key: "amount", label: "Amount", render: (row) => `$${row.amount.toFixed(2)}` },
  { key: "issuedBy", label: "Issued By" },
  { key: "createdAt", label: "Date" },
];

export default function Vouchers() {
  return (
    <div className="page">
      <h1>Voucher Management</h1>
      <DataTable columns={columns} rows={vouchers} />
    </div>
  );
}
