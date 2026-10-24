// FastMCP server exposing Weather Underground PWS data as MCP tools over HTTP.
// MCP endpoint: http://localhost:<WU_MCP_PORT>/mcp  (default port: 3003)
import { FastMCP } from "fastmcp";
import { registerWeatherTools } from "./weather-tools.js";

const server = new FastMCP({
  name: "weather-underground",
  version: "1.0.0",
  instructions:
    "Provides current and historical weather data from Weather Underground personal weather stations (PWS).",
});

registerWeatherTools(server);

const PORT = Number(process.env.WU_MCP_PORT ?? 3003);

await server.start({
  transportType: "httpStream",
  httpStream: { port: PORT, stateless: true }, // stateless: new session per request, no server-side session storage
});

if (!process.env.WU_API_KEY) {
  console.warn("WARNING: WU_API_KEY is not set — tool calls will fail");
}
