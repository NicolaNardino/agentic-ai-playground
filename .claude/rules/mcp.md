---
paths:
  - "src/mcp/**/*.ts"
---

# MCP Rules

## Tool parameters must be Zod schemas

FastMCP requires Zod for all `parameters`. Never pass a plain object.

```ts
// correct
parameters: z.object({
  stationId: z.string().describe("PWS station ID"),
  units: z.enum(["m", "e"]).default("m"),
})

// wrong
parameters: { stationId: string }
```

## `execute` must return `string`

FastMCP tool results are strings. Serialize objects before returning — do not return raw parsed JSON.

```ts
execute: async ({ stationId }) => JSON.stringify(await fetchData(stationId), null, 2)
```

## Annotate read-only and external API tools

All tools that only read data should carry `readOnlyHint: true`. Tools that call external APIs should also set `openWorldHint: true`.

```ts
annotations: { readOnlyHint: true, openWorldHint: true }
```

## Start the server in stateless HTTP mode

Use `stateless: true` so each request gets a fresh session. This avoids server-side session storage.

```ts
server.start({ transportType: "httpStream", httpStream: { port: PORT, stateless: true } });
```

## Shared Zod sub-schemas at module level

Define reusable parameter schemas (e.g. `unitsParam`) once at the top of the file and reference them across tools rather than repeating the definition inline.
