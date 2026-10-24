import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { ScriptedModel, type Turn } from "./helpers/scripted-model.js";

// Every agent the server builds gets the next scripted model; no LLM or MCP server is reached.
const models: ScriptedModel[] = [];
let nextTurns: Turn[] = [];

vi.mock("../src/models.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/models.js")>()),
  makeModel: () => {
    const model = new ScriptedModel(nextTurns);
    models.push(model);
    return model;
  },
}));
vi.mock("../src/mcp/weather-mcp-client.js", () => ({ tryConnectWeatherMcp: async () => null }));

const { app } = await import("../src/server.js");

let server: Server;
let base: string;

beforeAll(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  models.length = 0;
});

function post(path: string, body: unknown): Promise<Response> {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe.each(["/api/chat", "/api/chat/stream"])("POST %s validation", (path) => {
  it("returns 400 without a prompt", async () => {
    const res = await post(path, {});
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "prompt is required" });
  });

  it("returns 400 for an unknown backend", async () => {
    const res = await post(path, { prompt: "hi", backend: "openai" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/backend must be one of/);
  });
});

describe("POST /api/chat", () => {
  it("returns the response and token usage", async () => {
    nextTurns = [{ text: "Hello!" }];
    const res = await post("/api/chat", { prompt: "hi", backend: "ollama" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ response: "Hello!", usage: { inputTokens: 10, outputTokens: 5 } });
  });

  it("remembers the conversation within a session", async () => {
    nextTurns = [{ text: "first" }, { text: "second" }];
    await post("/api/chat", { prompt: "one", backend: "ollama", sessionId: "s1" });
    await post("/api/chat", { prompt: "two", backend: "ollama", sessionId: "s1" });

    expect(models).toHaveLength(1);
    expect(models[0].seenMessageCounts).toEqual([1, 3]); // second call sees prompt, reply, prompt
  });
});

describe("POST /api/chat/stream", () => {
  it("streams tool calls, text and a done event as NDJSON", async () => {
    nextTurns = [
      { toolUse: { name: "calculator", input: { operation: "multiply", a: 42, b: 7 } } },
      { text: "42 x 7 = 294" },
    ];
    const res = await post("/api/chat/stream", { prompt: "42 x 7?", backend: "ollama" });
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");

    const events = (await res.text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(events.map((e) => e.type)).toEqual(["tool_start", "tool_end", "text", "done"]);
    expect(events[1]).toMatchObject({ status: "success", output: "294" });
    expect(events[3].usage).toEqual({ inputTokens: 20, outputTokens: 10 });
  });

  it("reports agent failures as an error event", async () => {
    nextTurns = []; // the scripted model throws when it runs out of turns
    const res = await post("/api/chat/stream", { prompt: "hi", backend: "ollama" });
    const events = (await res.text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(events).toEqual([{ type: "error", error: "ScriptedModel: no turns left" }]);
  });
});
