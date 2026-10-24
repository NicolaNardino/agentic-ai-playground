import { describe, it, expect, afterEach, vi } from "vitest";
import type { FastMCP } from "fastmcp";
import { registerWeatherTools } from "../src/mcp/weather-tools.js";
import { stubFetch } from "./helpers/fetch-stub.js";

interface RegisteredTool {
  name: string;
  parameters: { parse: (input: unknown) => Record<string, string> };
  annotations: { readOnlyHint: boolean; openWorldHint: boolean };
  execute: (args: Record<string, string>) => Promise<string>;
}

// Captures addTool calls instead of starting a real server.
function registeredTools(): Map<string, RegisteredTool> {
  const tools = new Map<string, RegisteredTool>();
  registerWeatherTools({ addTool: (t: RegisteredTool) => tools.set(t.name, t) } as unknown as FastMCP);
  return tools;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("registerWeatherTools", () => {
  it("registers the three read-only tools", () => {
    const tools = registeredTools();
    expect([...tools.keys()]).toEqual(["get_current_conditions", "get_hourly_history", "get_daily_history"]);
    for (const t of tools.values()) expect(t.annotations).toEqual({ readOnlyHint: true, openWorldHint: true });
  });

  it("defaults units to metric", () => {
    const tool = registeredTools().get("get_current_conditions")!;
    expect(tool.parameters.parse({ stationId: "IBAAR1" })).toEqual({ stationId: "IBAAR1", units: "m" });
  });

  it.each([
    ["get_current_conditions", { stationId: "IBAAR1", units: "m" }, "/v2/pws/observations/current"],
    ["get_hourly_history", { stationId: "IBAAR1", units: "m" }, "/v2/pws/observations/hourly/7day"],
    ["get_daily_history", { stationId: "IBAAR1", date: "20260516", units: "m" }, "/v2/pws/history/daily"],
  ])("%s calls %s and returns the JSON as a string", async (name, args, path) => {
    vi.stubEnv("WU_API_KEY", "key123");
    const urls = stubFetch({ ok: true });

    const result = await registeredTools().get(name)!.execute(args);

    expect(new URL(urls[0]).pathname).toBe(path);
    expect(typeof result).toBe("string");
    expect(JSON.parse(result)).toEqual({ ok: true });
  });
});
