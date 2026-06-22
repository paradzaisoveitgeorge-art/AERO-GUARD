export default function Topbar({ view, onToggleView, user }) {
  return (
    <header className="topbar">
      <div className="topbar__title">
        {view === "provider" ? "Provider Hub" : "Consultant Workspace"}
      </div>
      <div className="topbar__actions">
        <span className="topbar__user">{user?.fullName}</span>
        <button className="topbar__toggle" onClick={onToggleView}>
          Switch to {view === "provider" ? "Consultant" : "Provider"} view
        </button>
      </div>
    </header>
  );
}
