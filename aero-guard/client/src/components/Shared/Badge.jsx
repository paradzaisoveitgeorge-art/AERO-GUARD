const COLORS = {
  open: "#f59e0b",
  acknowledged: "#3b82f6",
  resolved: "#22c55e",
  received: "#3b82f6",
  disputed: "#f59e0b",
  waived: "#22c55e",
  potential: "#94a3b8",
  low: "#94a3b8",
  medium: "#3b82f6",
  high: "#f59e0b",
  critical: "#ef4444",
  active: "#22c55e",
};

export default function Badge({ label }) {
  const color = COLORS[label?.toLowerCase()] || "#64748b";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color: "#fff",
        backgroundColor: color,
        textTransform: "capitalize",
      }}
    >
      {label}
    </span>
  );
}
