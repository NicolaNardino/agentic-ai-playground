// Express HTTP API — proxies prompts to a Strands agent.
//   POST /api/chat         → JSON { response, usage }
//   POST /api/chat/stream  → NDJSON stream of ChatEvent (text deltas, tool calls, done/error)
// Body: { prompt, backend?: "anthropic" (default) | "ollama" | "bedrock", sessionId? }.
// With a sessionId the agent keeps the conversation across requests.
import { pathToFileURL } from "node:url";
import express from "express";
import cors from "cors";
import { Agent, type Message } from "@strands-agents/sdk";
import { calculator, currentTime, weatherHistory, webFetch } from "./tools.js";
import { makeModel, type Backend } from "./models.js";
import { ChatSessions, parseChatRequest, toChatEvent, usageOf, type ChatEvent, type ChatRequest } from "./chat.js";
import { tryConnectWeatherMcp, type WeatherMcp } from "./mcp/weather-mcp-client.js";

/** How long to wait before retrying the weather MCP server after a failed connection. */
export const WEATHER_MCP_RETRY_MS = 30_000;

let weatherMcp: WeatherMcp | null = null;
let lastWeatherMcpAttempt = 0;

// The weather MCP server is optional: its tools are added when it is reachable.
async function weatherMcpTools(): Promise<WeatherMcp["tools"]> {
  if (!weatherMcp && Date.now() - lastWeatherMcpAttempt > WEATHER_MCP_RETRY_MS) {
    lastWeatherMcpAttempt = Date.now();
    weatherMcp = await tryConnectWeatherMcp();
  }
  return weatherMcp?.tools ?? [];
}

async function createAgent(backend: Backend, messages: Message[] = []): Promise<Agent> {
  const stationId = process.env.WU_STATION_ID;
  return new Agent({
    model: makeModel(backend),
    tools: [calculator, currentTime, webFetch, weatherHistory, ...(await weatherMcpTools())],
    messages,
    systemPrompt: stationId ? `The user's Weather Underground station ID is ${stationId}.` : undefined,
    printer: false,
  });
}

const sessions = new ChatSessions(createAgent);

function agentFor({ backend, sessionId }: ChatRequest): Promise<Agent> {
  return sessionId ? sessions.get(sessionId, backend) : createAgent(backend);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const request = parseChatRequest(req.body);
  if ("error" in request) {
    res.status(400).json(request);
    return;
  }

  try {
    const agent = await agentFor(request);
    const result = await agent.invoke(request.prompt);
    res.json({ response: result.toString(), usage: usageOf(result) });
  } catch (err) {
    res.status(500).json({ error: errorMessage(err) });
  }
});

app.post("/api/chat/stream", async (req, res) => {
  const request = parseChatRequest(req.body);
  if ("error" in request) {
    res.status(400).json(request);
    return;
  }

  res.setHeader("Content-Type", "application/x-ndjson");
  const send = (event: ChatEvent) => res.write(`${JSON.stringify(event)}\n`);
  const started = Date.now();
  let agent: Agent | undefined;
  res.on("close", () => {
    if (!res.writableEnded) agent?.cancel(); // client went away mid-answer
  });

  try {
    agent = await agentFor(request);
    const stream = agent.stream(request.prompt);
    let next = await stream.next();
    while (!next.done) {
      const event = toChatEvent(next.value);
      if (event) send(event);
      next = await stream.next();
    }
    send({ type: "done", durationMs: Date.now() - started, usage: usageOf(next.value) });
  } catch (err) {
    send({ type: "error", error: errorMessage(err) });
  }
  res.end();
});

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const PORT = process.env.PORT ?? 3001;
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}
