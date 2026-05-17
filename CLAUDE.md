# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Strands Agents Experiments

TypeScript playground for the [AWS Strands Agents SDK](https://github.com/strands-agents/sdk-typescript), experimenting with AWS Bedrock and local Ollama (Qwen3) models via a unified agent API, plus a FastMCP-based Weather Underground server.

## Commands

```bash
npm run ollama           # Strands agent via Ollama/Qwen3 (requires Ollama running locally)
npm run strands          # Strands agent via AWS Bedrock (requires AWS credentials)
npm run server           # Express chat API server on port 3001
npm run weather:server   # FastMCP Weather Underground MCP server on port 3003
npm run weather:test     # Direct WU API test — no server needed (requires WU_API_KEY, WU_STATION_ID)
npm test                 # Run all Vitest unit tests (no LLM calls made)
npm run test:watch       # Watch mode
npm run typecheck        # Type-check without emitting — one pre-existing error in polyfill.ts is expected
npm run build            # Compile to dist/
```

**Run a single test file:**
```bash
npx vitest run tests/tools.test.ts
```

## Architecture

All shared logic lives in exactly two modules. Agent scripts and tests import from these; never duplicate definitions.

| File | Purpose |
|---|---|
| `src/tools.ts` | Shared tool definitions (`calculator`, `current_time`) |
| `src/models.ts` | Model factory functions (`makeOllamaModel`, `makeBedrockModel`) |
| `src/ollama-agent.ts` | Runnable script: Strands agent backed by local Ollama/Qwen3 |
| `src/strands-agent.ts` | Runnable script: Strands agent backed by AWS Bedrock |
| `src/server.ts` | Express HTTP API — `POST /api/chat` proxies prompts to either agent backend |
| `src/mcp-weather-server.ts` | FastMCP server: Weather Underground PWS tools over HTTP on port 3003 |
| `src/weather-test.ts` | Direct REST test — current conditions + 24h hourly history from WU API |
| `src/polyfill.ts` | `Symbol.dispose` / `Symbol.asyncDispose` shim for Node < 20 |
| `tests/` | Vitest unit tests — `tools.test.ts`, `models.test.ts`, `agent.test.ts` |

## Key design decisions

**Ollama is wired through Strands' OpenAI-compatible provider** — not via an Ollama SDK. `makeOllamaModel()` points `OpenAIModel` at Ollama's `/v1` endpoint. Both agent scripts use the identical `Agent` API; swapping backends is a one-line model factory change.

**Tests call `tool.invoke()` directly** — no LLM, no mocking. The Strands `tool()` wrapper exposes `.invoke({ ... })` for unit testing. All tool tests in `tests/tools.test.ts` use this pattern.

**FastMCP weather server is stateless** — `start({ httpStream: { stateless: true } })` creates a new session per request. The MCP endpoint is at `http://localhost:3003/mcp`. The three tools (`get_current_conditions`, `get_hourly_history`, `get_daily_history`) all call the IBM Weather Company API (`api.weather.com`) using `WU_API_KEY` from the environment.

**Pre-existing typecheck error** — `src/polyfill.ts` produces a `TS2352` conversion error that existed before any changes here. `npm run typecheck` is still useful for catching errors in other files.

## Environment

Copy `.env.example` to `.env`. All `tsx` scripts pass `--env-file=.env` so the file is loaded automatically by Node — no dotenv package needed.

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
```

## Adding new Strands tools

1. Define and export from `src/tools.ts` using `tool({ name, description, inputSchema, callback })`
2. Add to the `tools` array in the agent scripts that need it
3. Add tests in `tests/tools.test.ts` using `tool.invoke({ ... })`
