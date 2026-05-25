// Main agent script: Anthropic model + built-in tools + live Weather Underground MCP tools.
// Requires the MCP weather server to be running first (npm run weather:server).
import { Agent, McpClient } from "@strands-agents/sdk";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { calculator, currentTime } from "./tools.js";
import { makeAnthropicModel, ANTHROPIC_DEFAULT_MODEL } from "./models.js";

const MCP_URL = process.env.WU_MCP_URL ?? "http://localhost:3003/mcp";

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  const mcpClient = new McpClient({ transport });
  const weatherTools = await mcpClient.listTools();

  const modelId = process.env.ANTHROPIC_MODEL_ID ?? ANTHROPIC_DEFAULT_MODEL;
  console.log(`=== Strands Agent (Anthropic ${modelId} + Weather MCP) ===`);
  console.log(`MCP tools loaded: ${weatherTools.map((t) => t.name).join(", ")}\n`);

  const agent = new Agent({
    model: makeAnthropicModel(),
    tools: [calculator, currentTime, ...weatherTools],
  });

  const stationId = process.env.WU_STATION_ID;
  if (!stationId) {
    throw new Error("WU_STATION_ID environment variable is required");
  }

  const result = await agent.invoke(
    `What is 42 multiplied by 7? What time is it? Also get the current weather for station ${stationId} and summarise it.`
  );

  console.log("Agent result:", result.toString());

  await mcpClient.disconnect();
}

main().catch(console.error);
