import { describe, it, expect } from "vitest";
import { Agent, type Message } from "@strands-agents/sdk";
import { calculator } from "../src/tools.js";
import { ChatSessions, parseChatRequest, toChatEvent, usageOf, type ChatEvent } from "../src/chat.js";
import type { Backend } from "../src/models.js";
import { ScriptedModel, type Turn } from "./helpers/scripted-model.js";

function scriptedAgent(turns: Turn[]): Agent {
  return new Agent({ model: new ScriptedModel(turns), tools: [calculator], printer: false });
}

async function collect(agent: Agent, prompt: string): Promise<ChatEvent[]> {
  const events: ChatEvent[] = [];
  for await (const e of agent.stream(prompt)) {
    const event = toChatEvent(e);
    if (event) events.push(event);
  }
  return events;
}

describe("parseChatRequest", () => {
  it("defaults the backend to anthropic", () => {
    expect(parseChatRequest({ prompt: "hi" })).toEqual({ prompt: "hi", backend: "anthropic", sessionId: undefined });
  });

  it("requires a prompt", () => {
    expect(parseChatRequest({})).toEqual({ error: "prompt is required" });
    expect(parseChatRequest(undefined)).toEqual({ error: "prompt is required" });
  });

  it("rejects an unknown backend", () => {
    expect(parseChatRequest({ prompt: "hi", backend: "openai" })).toHaveProperty("error");
  });

  it("rejects a non-string sessionId", () => {
    expect(parseChatRequest({ prompt: "hi", sessionId: 42 })).toHaveProperty("error");
  });
});

describe("toChatEvent", () => {
  it("maps text deltas and tool calls", async () => {
    const agent = scriptedAgent([
      { toolUse: { name: "calculator", input: { operation: "multiply", a: 6, b: 7 } } },
      { text: "The answer is 42." },
    ]);
    const events = await collect(agent, "6 x 7?");

    expect(events).toEqual([
      { type: "tool_start", id: "tool-1", name: "calculator", input: { operation: "multiply", a: 6, b: 7 } },
      { type: "tool_end", id: "tool-1", status: "success", output: "42" },
      { type: "text", text: "The answer is 42." },
    ]);
  });

  it("reports failing tools with status error", async () => {
    const agent = scriptedAgent([{ toolUse: { name: "no_such_tool", input: {} } }, { text: "Sorry." }]);
    const events = await collect(agent, "go");
    expect(events.find((e) => e.type === "tool_end")).toMatchObject({ status: "error" });
  });
});

describe("usageOf", () => {
  it("sums token usage across model calls", async () => {
    const agent = scriptedAgent([
      { toolUse: { name: "calculator", input: { operation: "add", a: 1, b: 1 } } },
      { text: "2" },
    ]);
    const result = await agent.invoke("1 + 1?");
    expect(usageOf(result)).toEqual({ inputTokens: 20, outputTokens: 10 });
  });
});

describe("ChatSessions", () => {
  let created: { backend: Backend; history: number }[] = [];
  const factory = (backend: Backend, messages: Message[]) => {
    created.push({ backend, history: messages.length });
    return new Agent({ model: new ScriptedModel([{ text: "a" }, { text: "b" }]), messages, printer: false });
  };

  it("reuses the agent within a session, so it remembers the conversation", async () => {
    created = [];
    const sessions = new ChatSessions(factory);
    const first = await sessions.get("s1", "ollama");
    await first.invoke("one");
    const second = await sessions.get("s1", "ollama");

    expect(second).toBe(first);
    expect(second.messages).toHaveLength(2);
    expect(created).toHaveLength(1);
  });

  it("carries the history over when the backend changes", async () => {
    created = [];
    const sessions = new ChatSessions(factory);
    await (await sessions.get("s1", "ollama")).invoke("one");
    const switched = await sessions.get("s1", "bedrock");

    expect(created).toEqual([{ backend: "ollama", history: 0 }, { backend: "bedrock", history: 2 }]);
    expect(switched.messages).toHaveLength(2);
  });

  it("keeps the session when switching to a backend fails", async () => {
    const sessions = new ChatSessions((backend, messages) => {
      if (backend === "anthropic") throw new Error("Anthropic API key is required");
      return factory(backend, messages);
    });
    const original = await sessions.get("s1", "ollama");
    await original.invoke("one");

    await expect(sessions.get("s1", "anthropic")).rejects.toThrow("API key");
    expect(await sessions.get("s1", "ollama")).toBe(original);
  });

  it("evicts the least recently used session", async () => {
    const sessions = new ChatSessions(factory, 2);
    const a = await sessions.get("a", "ollama");
    await sessions.get("b", "ollama");
    await sessions.get("a", "ollama"); // a is now the most recent
    await sessions.get("c", "ollama"); // evicts b

    expect(sessions.size).toBe(2);
    expect(await sessions.get("a", "ollama")).toBe(a);
  });
});
