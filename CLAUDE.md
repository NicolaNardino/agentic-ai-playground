# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Coding Guidelines

Behavioral guidelines to reduce common LLM coding mistakes.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

# Strands Agents Experiments

TypeScript playground for the [AWS Strands Agents SDK](https://github.com/strands-agents/sdk-typescript), experimenting with AWS Bedrock and local Ollama (Qwen3) models via a unified agent API, plus a FastMCP-based Weather Underground server.

## Commands

```bash
npm run ollama           # Strands agent via Ollama/Qwen3 (requires Ollama running locally)
npm run multi-agent      # Coordinator + weather specialist agents (args: [backend] ["prompt"], default ollama)
npm run compare          # Same prompt on every backend: latency, tokens, answers
npm run strands          # Strands agent via Anthropic API + Weather MCP (requires ANTHROPIC_API_KEY)
npm run server           # Express chat API server on port 3001
npm run weather:server   # FastMCP Weather Underground MCP server on port 3003
npm run weather:test     # Direct WU API test — no server needed (requires WU_API_KEY, WU_STATION_ID)
npm test                 # Run all Vitest unit and route tests (no LLM or network calls)
npm run test:watch       # Watch mode
npm run typecheck        # Type-check without emitting
npm run build            # Compile to dist/
```

**Run a single test file:**
```bash
npx vitest run tests/tools.test.ts
```

## CI

`.github/workflows/ci.yml` runs on push / PR to `main` under Node 22 with two jobs: **agent** (`npm ci`, `typecheck`, `test`, `build` at the root) and **ui** (`npm ci` + `npm run build` in `src/ui`). Tests make no LLM or network calls, so CI needs no secrets.

## Architecture

Agent logic lives in two shared modules (`tools.ts`, `models.ts`); Weather Underground access lives in `src/weather/client.ts`. Agent scripts and tests import from these; never duplicate definitions.

| File | Purpose |
|---|---|
| `src/tools.ts` | Shared tool definitions (`calculator`, `current_time`, `web_fetch`, `weather_history`) |
| `src/chat.ts` | Chat plumbing: `parseChatRequest`, `ChatSessions` (one agent per session, LRU-capped), `toChatEvent` (Strands stream event → UI event) |
| `src/models.ts` | Model factory functions (`makeOllamaModel`, `makeAnthropicModel`, `makeBedrockModel`) and `makeModel(backend)` over the `Backend` union |
| `src/ollama-agent.ts` | Runnable script: Strands agent backed by local Ollama/Qwen3 |
| `src/strands-agent.ts` | Runnable script: Strands agent backed by Anthropic API + Weather MCP |
| `src/server.ts` | Express HTTP API — `POST /api/chat` (JSON) and `POST /api/chat/stream` (NDJSON); exports `app` and only listens when run directly |
| `src/multi-agent.ts` | Runnable script: coordinator agent delegating to a weather specialist agent via `asTool()` |
| `src/compare-backends.ts` | Runnable script: one prompt on every backend, prints latency/tokens/answers |
| `src/mcp/mcp-weather-server.ts` | FastMCP server entry point: Weather Underground PWS tools over HTTP on port 3003 |
| `src/mcp/weather-tools.ts` | `registerWeatherTools(server)` — the MCP tool definitions, testable without a server |
| `src/mcp/weather-mcp-client.ts` | `connectWeatherMcp` / `tryConnectWeatherMcp` — agent side of the MCP server |
| `src/weather/client.ts` | Shared WU API client (`wuFetch`, `requireEnv`) — used by the MCP server, the CLI test and `strands-agent.ts` |
| `src/weather/main.ts` | Entry point for `npm run weather:test` — orchestrates the three print functions |
| `src/weather/weather-test.ts` | Exported helpers: `testCurrentConditions`, `testHourlyHistory`, `getDailySummaries`, `getDailySummary` |
| `src/weather/types.ts` | WU API response interfaces (`Metric`, `Observation`, `DailySummary`, etc.) |
| `tests/` | Vitest tests; `helpers/scripted-model.ts` is a fake Strands model that replays scripted turns, `helpers/fetch-stub.ts` stubs `fetch` |

## Key design decisions

**Ollama is wired through Strands' OpenAI-compatible provider** — not via an Ollama SDK. `makeOllamaModel()` points `OpenAIModel` at Ollama's `/v1` endpoint. All agent scripts use the identical `Agent` API; swapping backends is a one-line model factory change.

**Tests call `tool.invoke()` directly** — no LLM. The Strands `tool()` wrapper exposes `.invoke({ ... })` for unit testing; tools that call HTTP APIs are tested with `stubFetch`. Agent-level behaviour (streaming events, sessions, routes) runs against `ScriptedModel`; `server.test.ts` swaps it in with `vi.mock("../src/models.js")`.

**The chat server keeps one agent per `sessionId`** (`ChatSessions`, LRU-capped at `MAX_SESSIONS`). Switching backend builds a new agent seeded with the session's messages; if that fails (e.g. no API key) the session is kept unchanged. The weather MCP tools are added to new agents when the MCP server is reachable (retried at most every 30 s).

**`web_fetch` is deliberately read-only** (GET, text only, capped) — not the SDK's vended `http_request`, which also allows POST/PUT/DELETE.

**FastMCP weather server is stateless** — `start({ httpStream: { stateless: true } })` creates a new session per request. The MCP endpoint is at `http://localhost:3003/mcp`. The three tools (`get_current_conditions`, `get_hourly_history`, `get_daily_history`) all call the IBM Weather Company API (`api.weather.com`) using `WU_API_KEY` from the environment.

**WU API tier split** — `getDailySummaries` uses `/v2/pws/dailysummary/7day` (free PWS-owner tier). `getDailySummary(stationId, date)` uses `/v2/pws/history/daily?date=YYYYMMDD`, which requires a paid subscription; it returns no data on a free key.

## Environment

Copy `.env.example` to `.env`. All `tsx` scripts run with `--import dotenv/config`, so the file is loaded automatically (and is optional).

```
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
STRANDS_MODEL_ID=us.anthropic.claude-sonnet-4-5
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
ANTHROPIC_API_KEY=...            # Direct Anthropic API (alternative to Bedrock)
ANTHROPIC_MODEL_ID=claude-sonnet-4-6
WU_API_KEY=...           # Weather Underground API key
WU_STATION_ID=...        # Your PWS station ID (e.g. IXXXXX1)
WU_MCP_PORT=3003         # MCP server port (default: 3003)
WU_MCP_URL=http://localhost:3003/mcp      # MCP endpoint agents connect to
WEATHER_DASHBOARD_URL=http://localhost:3000  # weather-dashboard app for weather_history
```

## Adding new Strands tools

1. Define and export from `src/tools.ts` using `tool({ name, description, inputSchema, callback })`
2. Add to the `tools` array in the agent scripts that need it
3. Add tests in `tests/tools.test.ts` using `tool.invoke({ ... })`
