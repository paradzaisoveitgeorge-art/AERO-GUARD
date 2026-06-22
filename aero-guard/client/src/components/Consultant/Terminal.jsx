import { useState } from "react";

export default function Terminal() {
  const [history, setHistory] = useState([
    { type: "system", text: "GDS Terminal Mockup — practice commands here." },
  ]);
  const [input, setInput] = useState("");

  function runCommand(e) {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;
    setHistory((prev) => [...prev, { type: "command", text: cmd }, { type: "response", text: "OK" }]);
    setInput("");
  }

  return (
    <div className="page">
      <h1>GDS Terminal</h1>
      <div className="terminal">
        {history.map((line, i) => (
          <div key={i} className={`terminal__line terminal__line--${line.type}`}>
            {line.type === "command" ? `> ${line.text}` : line.text}
          </div>
        ))}
      </div>
      <form className="inline-form" onSubmit={runCommand}>
        <input className="terminal-input" placeholder="Enter command" value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit">Run</button>
      </form>
    </div>
  );
}
