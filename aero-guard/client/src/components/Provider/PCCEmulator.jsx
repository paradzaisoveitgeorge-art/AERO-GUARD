import { useState } from "react";

const CANNED_RESPONSES = {
  "*PNR1000": "1. SMITH/JOHN MR  2A NYC LHR 14JUN  CONFIRMED",
  "HX": "QUEUE CLEARED - 0 ITEMS REMAINING",
};

export default function PCCEmulator() {
  const [history, setHistory] = useState([
    { type: "system", text: "AERO-GUARD Remote PCC Emulator — type a GDS command and press Enter." },
  ]);
  const [input, setInput] = useState("");

  function runCommand(e) {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;
    const response = CANNED_RESPONSES[cmd.toUpperCase()] || "INVALID FORMAT - CHECK ENTRY";
    setHistory((prev) => [...prev, { type: "command", text: cmd }, { type: "response", text: response }]);
    setInput("");
  }

  return (
    <div className="page">
      <h1>PCC Emulator (Remote Terminal Access)</h1>
      <div className="terminal">
        {history.map((line, i) => (
          <div key={i} className={`terminal__line terminal__line--${line.type}`}>
            {line.type === "command" ? `> ${line.text}` : line.text}
          </div>
        ))}
      </div>
      <form className="inline-form" onSubmit={runCommand}>
        <input
          className="terminal-input"
          placeholder="Enter GDS command (try *PNR1000 or HX)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit">Run</button>
      </form>
    </div>
  );
}
