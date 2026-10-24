// Client side of the Weather Underground MCP server: connects and lists its tools.
import { McpClient } from "@strands-agents/sdk";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export const WU_MCP_DEFAULT_URL = "http://localhost:3003/mcp";

export interface WeatherMcp {
  client: McpClient;
  tools: Awaited<ReturnType<McpClient["listTools"]>>;
}

/** Connects to the weather MCP server (WU_MCP_URL) and loads its tools. Throws if it is unreachable. */
export async function connectWeatherMcp(): Promise<WeatherMcp> {
  const url = process.env.WU_MCP_URL ?? WU_MCP_DEFAULT_URL;
  const client = new McpClient({ transport: new StreamableHTTPClientTransport(new URL(url)) });
  try {
    return { client, tools: await client.listTools() };
  } catch (err) {
    await client.disconnect().catch(() => {});
    throw err;
  }
}

/** Like connectWeatherMcp, but returns null (with a warning) when the server is not running. */
export async function tryConnectWeatherMcp(): Promise<WeatherMcp | null> {
  try {
    return await connectWeatherMcp();
  } catch (err) {
    console.warn(`Weather MCP server unavailable, continuing without weather tools: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}
