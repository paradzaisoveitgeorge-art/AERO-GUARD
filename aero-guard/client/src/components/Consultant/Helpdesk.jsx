import { useState } from "react";
import { helpdeskMessages as seed } from "../../data/mockData.js";

const CURRENT_CONSULTANT = "Lucy Wanjiru";

export default function Helpdesk() {
  const [messages, setMessages] = useState(seed);
  const [text, setText] = useState("");

  function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, agencyId: 1, sender: CURRENT_CONSULTANT, senderRole: "consultant", message: text, createdAt: new Date().toLocaleString() },
    ]);
    setText("");
  }

  return (
    <div className="page">
      <h1>Helpdesk</h1>
      <div className="chat-window">
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble chat-bubble--${m.senderRole}`}>
            <strong>{m.sender}</strong>
            <span>{m.message}</span>
            <small>{m.createdAt}</small>
          </div>
        ))}
      </div>
      <form className="inline-form" onSubmit={send}>
        <input placeholder="Message support..." value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
