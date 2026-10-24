import { describe, it, expect, vi, afterEach } from "vitest";
import {
  calculator,
  currentTime,
  htmlToText,
  webFetch,
  weatherHistory,
  WEB_FETCH_MAX_CHARS,
  WEATHER_DASHBOARD_DEFAULT_URL,
  WEATHER_HISTORY_MAX_ROWS,
} from "../src/tools.js";
import { stubFetch } from "./helpers/fetch-stub.js";

describe("calculator", () => {
  it("adds two numbers", async () => {
    expect(await calculator.invoke({ operation: "add", a: 3, b: 4 })).toBe("7");
  });

  it("subtracts", async () => {
    expect(await calculator.invoke({ operation: "subtract", a: 10, b: 3 })).toBe("7");
  });

  it("multiplies", async () => {
    expect(await calculator.invoke({ operation: "multiply", a: 6, b: 7 })).toBe("42");
  });

  it("divides", async () => {
    expect(await calculator.invoke({ operation: "divide", a: 10, b: 2 })).toBe("5");
  });

  it("returns error on division by zero", async () => {
    expect(await calculator.invoke({ operation: "divide", a: 5, b: 0 })).toBe("Error: division by zero");
  });

  it("handles negative numbers", async () => {
    expect(await calculator.invoke({ operation: "add", a: -3, b: -4 })).toBe("-7");
  });

  it("handles floating point", async () => {
    expect(await calculator.invoke({ operation: "divide", a: 1, b: 4 })).toBe("0.25");
  });
});

describe("currentTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a valid ISO timestamp", async () => {
    const before = Date.now();
    const result = await currentTime.invoke({});
    const after = Date.now();
    const ts = new Date(result as string).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("reflects mocked system time", async () => {
    vi.useFakeTimers();
    const fixed = new Date("2025-01-15T12:00:00.000Z");
    vi.setSystemTime(fixed);
    const result = await currentTime.invoke({});
    expect(result).toBe("2025-01-15T12:00:00.000Z");
  });
});

describe("htmlToText", () => {
  it("drops tags, scripts and styles, decodes entities and collapses whitespace", () => {
    const html = "<html><head><style>p{}</style><script>alert(1)</script></head><body><p>Fish &amp; chips</p>\n\n<p>&lt;3</p></body></html>";
    expect(htmlToText(html)).toBe("Fish & chips <3");
  });
});

describe("webFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the text of an HTML page", async () => {
    stubFetch("<h1>Hello</h1><p>world</p>", { contentType: "text/html; charset=utf-8" });
    expect(await webFetch.invoke({ url: "https://example.com" })).toBe("Hello world");
  });

  it("returns non-HTML bodies as-is", async () => {
    stubFetch('{"a":1}', { contentType: "application/json" });
    expect(await webFetch.invoke({ url: "https://example.com/data.json" })).toBe('{"a":1}');
  });

  it("truncates long content", async () => {
    stubFetch("x".repeat(WEB_FETCH_MAX_CHARS + 10));
    const result = (await webFetch.invoke({ url: "https://example.com" })) as string;
    expect(result.startsWith("x".repeat(WEB_FETCH_MAX_CHARS))).toBe(true);
    expect(result).toContain("[truncated: 10 more characters]");
  });

  it("reports HTTP errors", async () => {
    stubFetch("nope", { status: 404 });
    expect(await webFetch.invoke({ url: "https://example.com/missing" })).toBe("Error: HTTP 404");
  });

  it("refuses non-http URLs", async () => {
    const urls = stubFetch("secret");
    expect(await webFetch.invoke({ url: "file:///etc/passwd" })).toBe("Error: only http and https URLs are supported");
    expect(urls).toHaveLength(0);
  });
});

describe("weatherHistory", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const stats = { tempAvg: 12.3, precipTotal: 4.5 };
  const coverage = { missing: [] };

  it("queries the dashboard's range endpoint", async () => {
    vi.stubEnv("WEATHER_DASHBOARD_URL", "http://dashboard:4000");
    const urls = stubFetch({ rows: [], stats, coverage });
    await weatherHistory.invoke({ from: "2026-10-01", to: "2026-10-07" });
    expect(urls[0]).toBe("http://dashboard:4000/api/range?from=2026-10-01&to=2026-10-07");
  });

  it(`defaults to ${WEATHER_DASHBOARD_DEFAULT_URL}`, async () => {
    vi.stubEnv("WEATHER_DASHBOARD_URL", undefined);
    const urls = stubFetch({ rows: [], stats, coverage });
    await weatherHistory.invoke({ from: "2026-10-01", to: "2026-10-07" });
    expect(urls[0].startsWith(`${WEATHER_DASHBOARD_DEFAULT_URL}/api/range`)).toBe(true);
  });

  it("includes daily rows for short ranges", async () => {
    stubFetch({ rows: [{ date: "2026-10-01" }], stats, coverage });
    const result = JSON.parse((await weatherHistory.invoke({ from: "2026-10-01", to: "2026-10-01" })) as string);
    expect(result).toEqual({ stats, coverage, rows: [{ date: "2026-10-01" }] });
  });

  it("returns only stats for long ranges", async () => {
    stubFetch({ rows: Array.from({ length: WEATHER_HISTORY_MAX_ROWS + 1 }, () => ({})), stats, coverage });
    const result = JSON.parse((await weatherHistory.invoke({ from: "2026-01-01", to: "2026-12-31" })) as string);
    expect(result).toEqual({ stats, coverage });
  });

  it("reports dashboard errors", async () => {
    stubFetch({ error: "bad range" }, { status: 400 });
    expect(await weatherHistory.invoke({ from: "2026-10-07", to: "2026-10-01" })).toBe(
      "Error: weather dashboard returned HTTP 400"
    );
  });
});
