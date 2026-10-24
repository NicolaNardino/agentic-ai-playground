// Weather Underground PWS tools, registered on a FastMCP server. Kept apart from the server
// entry point so the tool definitions can be unit-tested without starting a server.
import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { wuFetch } from "../weather/client.js";

// FastMCP tool results must be strings, so the parsed API response is re-serialized.
async function wuFetchText(path: string, params: Record<string, string>): Promise<string> {
  return JSON.stringify(await wuFetch(path, params), null, 2);
}

const unitsParam = z
  .enum(["m", "e", "h", "s"])
  .default("m")
  .describe("Unit system: m=metric, e=imperial, h=hybrid, s=SI");

export function registerWeatherTools(server: FastMCP): void {
  server.addTool({
    name: "get_current_conditions",
    description:
      "Get current weather observations from a Weather Underground personal weather station",
    parameters: z.object({
      stationId: z.string().describe("PWS station ID (e.g. IXXXXX1)"),
      units: unitsParam,
    }),
    annotations: { readOnlyHint: true, openWorldHint: true },
    execute: async ({ stationId, units }) =>
      wuFetchText("/v2/pws/observations/current", { stationId, units }),
  });

  server.addTool({
    name: "get_hourly_history",
    description:
      "Get 7-day hourly weather observations from a Weather Underground personal weather station",
    parameters: z.object({
      stationId: z.string().describe("PWS station ID"),
      units: unitsParam,
    }),
    annotations: { readOnlyHint: true, openWorldHint: true },
    execute: async ({ stationId, units }) =>
      wuFetchText("/v2/pws/observations/hourly/7day", { stationId, units }),
  });

  server.addTool({
    name: "get_daily_history",
    description:
      "Get daily weather summary for a specific date from a Weather Underground personal weather station",
    parameters: z.object({
      stationId: z.string().describe("PWS station ID"),
      date: z.string().describe("Date in YYYYMMDD format (e.g. 20260516)"),
      units: unitsParam,
    }),
    annotations: { readOnlyHint: true, openWorldHint: true },
    execute: async ({ stationId, date, units }) =>
      wuFetchText("/v2/pws/history/daily", { stationId, date, units }),
  });
}
