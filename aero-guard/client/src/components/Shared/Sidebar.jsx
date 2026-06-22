import { NavLink } from "react-router-dom";

const PROVIDER_LINKS = [
  { to: "/provider/overview", label: "Overview" },
  { to: "/provider/agencies", label: "Agencies" },
  { to: "/provider/violations", label: "Violations" },
  { to: "/provider/audits", label: "ADM Audits" },
  { to: "/provider/vouchers", label: "Vouchers" },
  { to: "/provider/support", label: "Support" },
  { to: "/provider/pcc-emulator", label: "PCC Emulator" },
];

const CONSULTANT_LINKS = [
  { to: "/consultant/terminal", label: "Terminal" },
  { to: "/consultant/alerts", label: "Alerts" },
  { to: "/consultant/my-stats", label: "My Stats" },
  { to: "/consultant/helpdesk", label: "Helpdesk" },
  { to: "/consultant/passport-ocr", label: "Passport OCR" },
];

export default function Sidebar({ view }) {
  const links = view === "provider" ? PROVIDER_LINKS : CONSULTANT_LINKS;
  return (
    <nav className="sidebar">
      <div className="sidebar__brand">🛡️ AERO-GUARD</div>
      <ul className="sidebar__links">
        {links.map((link) => (
          <li key={link.to}>
            <NavLink to={link.to} className={({ isActive }) => (isActive ? "active" : "")}>
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
