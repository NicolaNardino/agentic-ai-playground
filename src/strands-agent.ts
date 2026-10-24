// Main agent script: Anthropic model + built-in tools + live Weather Underground MCP tools.
// Requires the MCP weather server to be running first (npm run weather:server).
import { Agent } from "@strands-agents/sdk";
import { calculator, currentTime } from "./tools.js";
import { makeAnthropicModel, ANTHROPIC_DEFAULT_MODEL } from "./models.js";
import { requireEnv } from "./weather/client.js";
import { connectWeatherMcp } from "./mcp/weather-mcp-client.js";

async function main() {
  const stationId = requireEnv("WU_STATION_ID");

  const { client: mcpClient, tools: weatherTools } = await connectWeatherMcp();
  try {
    const model = makeAnthropicModel();

    console.log(`=== Strands Agent (Anthropic ${model.modelId ?? ANTHROPIC_DEFAULT_MODEL} + Weather MCP) ===`);
    console.log(`MCP tools loaded: ${weatherTools.map((t) => t.name).join(", ")}\n`);

    const agent = new Agent({ model, tools: [calculator, currentTime, ...weatherTools] });
    const result = await agent.invoke(
      `What is 42 multiplied by 7? What time is it? Also get the current weather for station ${stationId} and summarise it.`
    );

    console.log("Agent result:", result.toString());
  } finally {
    await mcpClient.disconnect();
  }
}

main().catch(console.error);
