# TypeScript Rules

## ESM imports require `.js` extensions

All local imports must use `.js` extensions, even for `.ts` source files. Node's ESM loader resolves them at runtime and will fail without the extension.

```ts
// correct
import { calculator } from "./tools.js";
import type { Metric } from "./types.js";

// wrong — will fail at runtime
import { calculator } from "./tools";
```

## `import type` for type-only imports

Use `import type` whenever only types or interfaces are imported. This has zero runtime cost and makes the boundary explicit.

## `unknown` for external API responses; narrow at the call site

Fetch helpers that call external APIs should return `Promise<unknown>`. Callers cast with `as` once they know the shape, keeping the unsafe boundary in one place.

```ts
async function wuFetch(...): Promise<unknown> { ... }

const data = await wuFetch(...) as CurrentResponse;
```

## `interface` over `type` for object shapes

Use `interface` for all plain object shapes. Reserve `type` for unions, intersections, and aliases of primitives.

## Export named constants for default values

Do not hardcode default model IDs or config values inline. Export them as named constants so callers can reference them without repeating strings.

```ts
export const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-6";
```
