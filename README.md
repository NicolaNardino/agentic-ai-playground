# Strands Agents Experiments

A TypeScript playground built around three main components:

1. **Chat UI** — a browser-based interface for interacting with LLMs
2. **Agentic AI app** — a tool-using agent built on the [AWS Strands Agents SDK](https://github.com/strands-agents/sdk-typescript), backed by AWS Bedrock, Anthropic, or a locally running Ollama model
3. **Weather Underground MCP server** — a remote [FastMCP](https://github.com/punkpeye/fastmcp) server that connects any MCP-compatible client to Weather Underground personal weather stations

## Features

- **Chat UI** — browser front-end that streams the agent's answer as it is written, shows each tool call (input and output), keeps the conversation per session ("New chat" starts over), and shows time and token use per answer
- **Strands agent via AWS Bedrock, Anthropic, or Ollama** — runs any supported model through the Strands SDK; Ollama is wired through Strands' OpenAI-compatible provider so all backends share the same agent API
- **Agent tools** — `calculator`, `current_time`, `web_fetch` (read-only page fetch, text only, capped at 8000 characters), `weather_history` (your station's recorded history from the [weather-dashboard](https://github.com/NicolaNardino/weather-dashboard) app), plus the Weather Underground MCP tools when the MCP server is running
- **Express chat API** — `POST /api/chat` (JSON) and `POST /api/chat/stream` (NDJSON events) proxy prompts to the Strands agent; body fields `prompt`, `backend` (`"anthropic"` (default), `"ollama"` or `"bedrock"`) and an optional `sessionId` to keep the conversation
- **Multi-agent demo** — a coordinator agent that delegates weather questions to a weather specialist agent (agent as tool)
- **Backend comparison** — runs one prompt on every backend and prints latency, token use and answers
- **Weather Underground MCP server** — stateless MCP server exposing three tools over HTTP:
  - `get_current_conditions` — live PWS observations
  - `get_hourly_history` — 7-day hourly history
  - `get_daily_history` — daily summary for a specific date
- **Direct Weather Underground API test** — standalone script to verify WU credentials and inspect raw data without a running server

## Requirements

- Node.js 22+
- AWS credentials with Bedrock access to Anthropic models, a direct Anthropic API key, or Ollama running locally
- Weather Underground API key + PWS station ID (for weather features)

## Setup

```bash
npm install
cp .env.example .env   # fill in your credentials
```

## Usage

```bash
npm run strands          # run the Strands agent via Anthropic + Weather MCP tools (start weather:server first)
npm run ollama           # run the Strands agent via local Ollama
npm run multi-agent      # coordinator + weather specialist agents (args: [backend] ["prompt"], default ollama)
npm run compare          # same prompt on every backend (arg: ["prompt"])
npm run server           # start the Express chat API on port 3001
npm run ui               # install and start the chat UI (Vite dev server, proxies /api to port 3001)
npm run weather:server   # start the FastMCP Weather Underground server on port 3003
npm run weather:test     # test WU API credentials directly (no server needed)
npm test                 # run all unit and route tests (no LLM or network calls)
npm run typecheck        # type-check without emitting
npm run build            # compile to dist/
```

### Chat UI

Start the API and the UI in two terminals, then open the URL Vite prints:

```bash
npm run server
npm run ui
```

The UI lets you pick the backend per request (Ollama, Anthropic or Bedrock; Ollama is the default). A backend without credentials returns an error message in the chat.

The weather tools are optional: the Weather Underground tools need `npm run weather:server` running, and `weather_history` needs the weather-dashboard app (default `http://localhost:3000`).

### Chat API

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is 42 multiplied by 7?", "backend": "ollama"}'
```

Returns `{ "response": "...", "usage": { "inputTokens": 0, "outputTokens": 0 } }`.

`POST /api/chat/stream` takes the same body and returns newline-delimited JSON events:

| Event | Fields |
|---|---|
| `text` | `text` — a piece of the answer |
| `tool_start` | `id`, `name`, `input` |
| `tool_end` | `id`, `status` (`success` / `error`), `output` (first 2000 characters) |
| `done` | `durationMs`, `usage` |
| `error` | `error` |

Pass the same `sessionId` on each request to keep the conversation. Changing `backend` within a session keeps the history.

### MCP endpoint

```
http://localhost:3003/mcp
```

Connect any MCP-compatible client (e.g. Claude Desktop) to this endpoint to use the weather tools.

## Project structure

```
src/
  index.ts              # lists the runnable scripts
  strands-agent.ts      # runnable Strands agent (Anthropic + Weather MCP)
  ollama-agent.ts       # runnable Strands agent (local Ollama via OpenAI-compatible provider)
  multi-agent.ts        # coordinator agent + weather specialist agent
  compare-backends.ts   # same prompt on every backend
  server.ts             # Express HTTP API (JSON and streaming routes)
  chat.ts               # chat request validation, per-session agents, stream event mapping
  tools.ts              # shared tool definitions (calculator, current_time, web_fetch, weather_history)
  models.ts             # model factory functions (Bedrock, Anthropic, Ollama) + makeModel(backend)
  weather/
    client.ts           # shared WU API client (wuFetch, requireEnv)
    main.ts             # direct WU API test script (npm run weather:test)
    weather-test.ts     # print helpers for current, hourly and daily data
    types.ts            # WU API response types
  mcp/
    mcp-weather-server.ts  # FastMCP Weather Underground MCP server (entry point)
    weather-tools.ts       # the server's tool definitions
    weather-mcp-client.ts  # connects agents to the MCP server
  ui/                   # browser chat UI (Vite/React — App.tsx, main.tsx)
tests/
  tools.test.ts
  models.test.ts
  agent.test.ts
  chat.test.ts
  server.test.ts            # route tests against the real Express app with a scripted model
  weather-client.test.ts
  mcp-weather-tools.test.ts
  helpers/                  # scripted fake model, fetch stub
.github/workflows/ci.yml  # GitHub Actions CI
```

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and pull request to `main`, on Node 22:

- **agent** — `npm ci`, `npm run typecheck`, `npm test`, `npm run build`
- **ui** — `npm ci` and `npm run build` in `src/ui`

The tests make no LLM or network calls, so CI needs no secrets.

## Environment variables

| Variable | Description |
|---|---|
| `AWS_REGION` | AWS region (default: `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `STRANDS_MODEL_ID` | Bedrock model ID (default: `us.anthropic.claude-sonnet-4-5`) |
| `ANTHROPIC_API_KEY` | Anthropic API key (alternative to Bedrock) |
| `ANTHROPIC_MODEL_ID` | Anthropic model ID (default: `claude-sonnet-4-6`) |
| `OLLAMA_HOST` | Ollama base URL (default: `http://localhost:11434`) |
| `OLLAMA_MODEL` | Ollama model name (default: `qwen3:8b`) |
| `WU_API_KEY` | Weather Underground API key |
| `WU_STATION_ID` | PWS station ID (e.g. `IXXXXX1`) |
| `WU_MCP_PORT` | MCP server port (default: `3003`) |
| `WU_MCP_URL` | MCP endpoint the agents connect to (default: `http://localhost:3003/mcp`) |
| `WEATHER_DASHBOARD_URL` | weather-dashboard app used by `weather_history` (default: `http://localhost:3000`) |
| `PORT` | Chat API port (default: `3001`) |
