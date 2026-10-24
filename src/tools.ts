// Shared Strands tool definitions — imported by agent scripts and unit tests.
import { tool } from "@strands-agents/sdk";
import { z } from "zod";

export const calculator = tool({
  name: "calculator",
  description: "Performs basic arithmetic operations",
  inputSchema: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number(),
    b: z.number(),
  }),
  callback: ({ operation, a, b }) => {
    switch (operation) {
      case "add":      return String(a + b);
      case "subtract": return String(a - b);
      case "multiply": return String(a * b);
      case "divide":
        if (b === 0) return "Error: division by zero";
        return String(a / b);
    }
  },
});

export const currentTime = tool({
  name: "current_time",
  description: "Returns the current date and time as an ISO string",
  inputSchema: z.object({}),
  callback: () => new Date().toISOString(),
});

export const WEB_FETCH_MAX_CHARS = 8000;
export const WEB_FETCH_TIMEOUT_MS = 15_000;

/** Reduces an HTML page to its visible text. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Read-only on purpose: GET only, text reduced and capped so a page can't flood the context window.
export const webFetch = tool({
  name: "web_fetch",
  description: "Fetches a web page (HTTP GET) and returns its text content, truncated if long",
  inputSchema: z.object({
    url: z.string().url().describe("http(s) URL to fetch"),
  }),
  callback: async ({ url }) => {
    if (!/^https?:\/\//i.test(url)) return "Error: only http and https URLs are supported";
    const res = await fetch(url, { signal: AbortSignal.timeout(WEB_FETCH_TIMEOUT_MS) });
    if (!res.ok) return `Error: HTTP ${res.status}`;
    const body = await res.text();
    const text = (res.headers.get("content-type") ?? "").includes("html") ? htmlToText(body) : body;
    return text.length > WEB_FETCH_MAX_CHARS
      ? `${text.slice(0, WEB_FETCH_MAX_CHARS)}\n[truncated: ${text.length - WEB_FETCH_MAX_CHARS} more characters]`
      : text;
  },
});

export const WEATHER_DASHBOARD_DEFAULT_URL = "http://localhost:3000";
/** Daily rows are only returned for ranges up to this many days; longer ranges return stats only. */
export const WEATHER_HISTORY_MAX_ROWS = 31;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

// Reads the weather-dashboard app's local station history (GET /api/range).
export const weatherHistory = tool({
  name: "weather_history",
  description:
    "Gets recorded weather from the user's own weather station history for a date range: aggregate stats " +
    `(temperature, rain, wind, ...) and, for ranges up to ${WEATHER_HISTORY_MAX_ROWS} days, the daily rows`,
  inputSchema: z.object({
    from: isoDate.describe("Start date, YYYY-MM-DD (inclusive)"),
    to: isoDate.describe("End date, YYYY-MM-DD (inclusive)"),
  }),
  callback: async ({ from, to }) => {
    const base = process.env.WEATHER_DASHBOARD_URL ?? WEATHER_DASHBOARD_DEFAULT_URL;
    const url = new URL("/api/range", base);
    url.searchParams.set("from", from);
    url.searchParams.set("to", to);
    const res = await fetch(url);
    if (!res.ok) return `Error: weather dashboard returned HTTP ${res.status}`;
    const data = (await res.json()) as { rows: unknown[]; stats: unknown; coverage: unknown };
    return JSON.stringify({
      stats: data.stats,
      coverage: data.coverage,
      ...(data.rows.length <= WEATHER_HISTORY_MAX_ROWS ? { rows: data.rows } : {}),
    });
  },
});
