# Strands Agents Experiments

A TypeScript playground for the [AWS Strands Agents SDK](https://github.com/strands-agents/sdk-typescript), exploring tool-using AI agents backed by AWS Bedrock, plus a FastMCP-based Weather Underground server.

## Features

- **Strands agent via AWS Bedrock** — runs a Claude model through the Strands SDK with built-in tools (`calculator`, `current_time`)
- **Express chat API** — `POST /api/chat` endpoint that proxies prompts to a Bedrock-backed Strands agent
- **Weather Underground MCP server** — stateless [FastMCP](https://github.com/punkpeye/fastmcp) server exposing three tools over HTTP for use by any MCP-compatible client:
  - `get_current_conditions` — live PWS observations
  - `get_hourly_history` — 7-day hourly history
  - `get_daily_history` — daily summary for a specific date
- **Direct Weather Underground API test** — standalone script to verify WU credentials and inspect raw data without a running server

## Requirements

- Node.js 22+
- AWS credentials with Bedrock access (or an Anthropic API key)
- Weather Underground API key + PWS station ID (for weather features)

## Setup

```bash
npm install
cp .env.example .env   # fill in your credentials
```

## Usage

```bash
npm run strands          # run the Bedrock-backed Strands agent
npm run server           # start the Express chat API on port 3001
npm run weather:server   # start the FastMCP Weather Underground server on port 3003
npm run weather:test     # test WU API credentials directly (no server needed)
npm test                 # run all unit tests
```

### Chat API

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is 42 multiplied by 7?"}'
```

### MCP endpoint

```
http://localhost:3003/mcp
```

Connect any MCP-compatible client (e.g. Claude Desktop) to this endpoint to use the weather tools.

## Project structure

```
src/
  strands-agent.ts      # runnable Bedrock-backed Strands agent
  server.ts             # Express HTTP API
  tools.ts              # shared tool definitions (calculator, current_time)
  models.ts             # model factory functions (Bedrock, Anthropic)
  weather-test.ts       # direct WU API test script
  mcp/
    weather-server.ts   # FastMCP Weather Underground MCP server
tests/
  tools.test.ts
  models.test.ts
  agent.test.ts
```

## Environment variables

| Variable | Description |
|---|---|
| `AWS_REGION` | AWS region (default: `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `STRANDS_MODEL_ID` | Bedrock model ID (default: `us.anthropic.claude-sonnet-4-5`) |
| `ANTHROPIC_API_KEY` | Anthropic API key (alternative to Bedrock) |
| `ANTHROPIC_MODEL_ID` | Anthropic model ID (default: `claude-sonnet-4-6`) |
| `WU_API_KEY` | Weather Underground API key |
| `WU_STATION_ID` | PWS station ID (e.g. `IXXXXX1`) |
| `WU_MCP_PORT` | MCP server port (default: `3003`) |
