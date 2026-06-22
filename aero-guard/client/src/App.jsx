import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import Sidebar from "./components/Shared/Sidebar.jsx";
import Topbar from "./components/Shared/Topbar.jsx";

import Overview from "./components/Provider/Overview.jsx";
import Agencies from "./components/Provider/Agencies.jsx";
import Violations from "./components/Provider/Violations.jsx";
import Audits from "./components/Provider/Audits.jsx";
import Support from "./components/Provider/Support.jsx";
import Vouchers from "./components/Provider/Vouchers.jsx";
import PCCEmulator from "./components/Provider/PCCEmulator.jsx";

import Terminal from "./components/Consultant/Terminal.jsx";
import Alerts from "./components/Consultant/Alerts.jsx";
import MyStats from "./components/Consultant/MyStats.jsx";
import Helpdesk from "./components/Consultant/Helpdesk.jsx";
import PassportOCR from "./components/Consultant/PassportOCR.jsx";

import { users } from "./data/mockData.js";

export default function App() {
  const [view, setView] = useState("provider");
  const navigate = useNavigate();
  const user = users.find((u) => u.role === (view === "provider" ? "provider" : "consultant"));

  function toggleView() {
    const next = view === "provider" ? "consultant" : "provider";
    setView(next);
    navigate(next === "provider" ? "/provider/overview" : "/consultant/terminal");
  }

  return (
    <div className="app-shell">
      <Sidebar view={view} />
      <div className="app-main">
        <Topbar view={view} user={user} onToggleView={toggleView} />
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to="/provider/overview" replace />} />

            <Route path="/provider/overview" element={<Overview />} />
            <Route path="/provider/agencies" element={<Agencies />} />
            <Route path="/provider/violations" element={<Violations />} />
            <Route path="/provider/audits" element={<Audits />} />
            <Route path="/provider/vouchers" element={<Vouchers />} />
            <Route path="/provider/support" element={<Support />} />
            <Route path="/provider/pcc-emulator" element={<PCCEmulator />} />

            <Route path="/consultant/terminal" element={<Terminal />} />
            <Route path="/consultant/alerts" element={<Alerts />} />
            <Route path="/consultant/my-stats" element={<MyStats />} />
            <Route path="/consultant/helpdesk" element={<Helpdesk />} />
            <Route path="/consultant/passport-ocr" element={<PassportOCR />} />

            <Route path="*" element={<Navigate to="/provider/overview" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
