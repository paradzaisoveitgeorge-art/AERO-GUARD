import MetricCard from "../Shared/MetricCard.jsx";
import { metricsFor } from "../../data/mockData.js";

export default function Overview() {
  const m = metricsFor();
  return (
    <div className="page">
      <h1>Provider Overview</h1>
      <div className="metric-grid">
        <MetricCard label="Active Agencies" value={m.activeAgencies} />
        <MetricCard label="Open Violations" value={m.openViolations} />
        <MetricCard label="Critical Violations" value={m.criticalViolations} hint="last 30 days" />
        <MetricCard label="ADM Exposure" value={`$${m.totalAdmExposure.toFixed(2)}`} />
        <MetricCard label="Disputed ADMs" value={m.disputedAdms} />
      </div>
    </div>
  );
}
