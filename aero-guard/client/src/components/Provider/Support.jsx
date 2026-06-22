import { useState } from "react";
import { helpdeskMessages as seed } from "../../data/mockData.js";

export default function Support() {
  const [messages, setMessages] = useState(seed);
  const [broadcast, setBroadcast] = useState("");
  const [reply, setReply] = useState("");

  function sendBroadcast(e) {
    e.preventDefault();
    if (!broadcast.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, agencyId: null, sender: "Aero Guard HQ", senderRole: "provider", message: `[Broadcast] ${broadcast}`, createdAt: new Date().toLocaleString() },
    ]);
    setBroadcast("");
  }

  function sendReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, agencyId: 1, sender: "Aero Guard HQ", senderRole: "provider", message: reply, createdAt: new Date().toLocaleString() },
    ]);
    setReply("");
  }

  return (
    <div className="page">
      <h1>Helpdesk + Broadcast</h1>
      <form className="inline-form" onSubmit={sendBroadcast}>
        <input
          placeholder="Broadcast a message to all agencies..."
          value={broadcast}
          onChange={(e) => setBroadcast(e.target.value)}
        />
        <button type="submit">Broadcast</button>
      </form>

      <div className="chat-window">
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble chat-bubble--${m.senderRole}`}>
            <strong>{m.sender}</strong>
            <span>{m.message}</span>
            <small>{m.createdAt}</small>
          </div>
        ))}
      </div>

      <form className="inline-form" onSubmit={sendReply}>
        <input placeholder="Reply to Skyline Travel..." value={reply} onChange={(e) => setReply(e.target.value)} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
