import { useState, useRef, useEffect, FormEvent } from "react";

type Backend = "anthropic" | "ollama" | "bedrock";

// Mirrors ChatEvent in src/chat.ts (the UI is a separate package and can't import it).
type ChatEvent =
  | { type: "text"; text: string }
  | { type: "tool_start"; id: string; name: string; input: unknown }
  | { type: "tool_end"; id: string; status: "success" | "error"; output: string }
  | { type: "done"; durationMs: number; usage?: { inputTokens: number; outputTokens: number } }
  | { type: "error"; error: string };

interface ToolCall {
  id: string;
  name: string;
  input: unknown;
  status: "running" | "success" | "error";
  output?: string;
}

interface Message {
  role: "user" | "assistant" | "error";
  text: string;
  tools?: ToolCall[];
  meta?: string;
}

/** Applies one stream event to the assistant message being built. */
function applyEvent(msg: Message, event: ChatEvent): Message {
  switch (event.type) {
    case "text":
      return { ...msg, text: msg.text + event.text };
    case "tool_start":
      return { ...msg, tools: [...(msg.tools ?? []), { id: event.id, name: event.name, input: event.input, status: "running" }] };
    case "tool_end":
      return {
        ...msg,
        tools: msg.tools?.map((t) => (t.id === event.id ? { ...t, status: event.status, output: event.output } : t)),
      };
    case "done": {
      const tokens = event.usage ? ` · ${event.usage.inputTokens} in / ${event.usage.outputTokens} out tokens` : "";
      return { ...msg, meta: `${(event.durationMs / 1000).toFixed(1)} s${tokens}` };
    }
    case "error":
      return { ...msg, role: "error", text: msg.text ? `${msg.text}\n\n${event.error}` : event.error };
  }
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [backend, setBackend] = useState<Backend>("ollama");
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function newChat() {
    setMessages([]);
    setSessionId(crypto.randomUUID());
  }

  // Replaces the last message (the assistant reply being streamed).
  function updateReply(update: (msg: Message) => Message) {
    setMessages((prev) => [...prev.slice(0, -1), update(prev[prev.length - 1])]);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: prompt }, { role: "assistant", text: "" }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, backend, sessionId }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        updateReply((msg) => applyEvent(msg, { type: "error", error: data.error ?? `Request failed (${res.status})` }));
        return;
      }

      // NDJSON: one event per line; a read can end mid-line, so keep the remainder.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) {
            const event = JSON.parse(line) as ChatEvent;
            updateReply((msg) => applyEvent(msg, event));
          }
        }
      }
    } catch (err) {
      updateReply((msg) => applyEvent(msg, { type: "error", error: err instanceof Error ? err.message : "Network error" }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="layout">
      <header className="header">
        <span className="title">Strands Agent</span>
        <div className="header-actions">
          <button className="new-chat-btn" type="button" onClick={newChat} disabled={loading}>
            New chat
          </button>
          <select
            className="backend-select"
            value={backend}
            onChange={(e) => setBackend(e.target.value as Backend)}
            disabled={loading}
          >
            <option value="ollama">Ollama (local)</option>
            <option value="anthropic">Anthropic</option>
            <option value="bedrock">AWS Bedrock</option>
          </select>
        </div>
      </header>

      <main className="messages">
        {messages.length === 0 && (
          <p className="empty">Send a message to get started.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <span className="bubble-label">{m.role === "user" ? "You" : m.role === "error" ? "Error" : "Agent"}</span>
            {m.tools?.map((t) => (
              <details key={t.id} className={`tool-call ${t.status}`}>
                <summary>
                  {t.name} · {t.status === "running" ? "running…" : t.status}
                </summary>
                <pre className="tool-detail">input: {JSON.stringify(t.input, null, 2)}</pre>
                {t.output !== undefined && <pre className="tool-detail">output: {t.output}</pre>}
              </details>
            ))}
            {(m.text || (loading && i === messages.length - 1)) && (
              <pre className="bubble-text">{m.text || "thinking…"}</pre>
            )}
            {m.meta && <span className="bubble-meta">{m.meta}</span>}
          </div>
        ))}
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
