import { useState, useRef, useEffect, FormEvent } from "react";

type Backend = "ollama" | "bedrock";

interface Message {
  role: "user" | "assistant" | "error";
  text: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [backend, setBackend] = useState<Backend>("ollama");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: prompt }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, backend }),
      });
      const data = await res.json() as { response?: string; error?: string };
      if (!res.ok || data.error) {
        setMessages((prev) => [...prev, { role: "error", text: data.error ?? "Request failed" }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", text: data.response! }]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "error", text: err instanceof Error ? err.message : "Network error" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="layout">
      <header className="header">
        <span className="title">Strands Agent</span>
        <select
          className="backend-select"
          value={backend}
          onChange={(e) => setBackend(e.target.value as Backend)}
          disabled={loading}
        >
          <option value="ollama">Ollama (local)</option>
          <option value="bedrock">AWS Bedrock</option>
        </select>
      </header>

      <main className="messages">
        {messages.length === 0 && (
          <p className="empty">Send a message to get started.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <span className="bubble-label">{m.role === "user" ? "You" : m.role === "error" ? "Error" : "Agent"}</span>
            <pre className="bubble-text">{m.text}</pre>
          </div>
        ))}
        {loading && (
          <div className="bubble assistant loading">
            <span className="bubble-label">Agent</span>
            <span className="dots">thinking…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <form className="input-row" onSubmit={submit}>
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter a prompt…"
          disabled={loading}
          autoFocus
        />
        <button className="send-btn" type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
