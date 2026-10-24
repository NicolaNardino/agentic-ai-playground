// Multi-agent demo: a coordinator agent delegates weather questions to a weather specialist
// agent, exposed to it as a tool (Strands "agent as tool").
// Usage: npm run multi-agent -- [backend] ["prompt"]   (backend defaults to ollama)
import { Agent } from "@strands-agents/sdk";
import { calculator, currentTime, weatherHistory } from "./tools.js";
import { BACKENDS, isBackend, makeModel } from "./models.js";
import { tryConnectWeatherMcp } from "./mcp/weather-mcp-client.js";

const DEFAULT_PROMPT =
  "How much rain fell at my station in the last 7 days, and what is that total multiplied by 12?";

async function main() {
  const [backend = "ollama", prompt = DEFAULT_PROMPT] = process.argv.slice(2);
  if (!isBackend(backend)) throw new Error(`backend must be one of: ${BACKENDS.join(", ")}`);

  const weatherMcp = await tryConnectWeatherMcp();
  try {
    const stationId = process.env.WU_STATION_ID;
    const weatherSpecialist = new Agent({
      name: "weather_specialist",
      model: makeModel(backend),
      tools: [currentTime, weatherHistory, ...(weatherMcp?.tools ?? [])],
      systemPrompt:
        "You are a weather analyst. Answer weather questions using your tools and report concrete numbers." +
        (stationId ? ` The user's Weather Underground station ID is ${stationId}.` : ""),
      printer: false,
    });

    const coordinator = new Agent({
      model: makeModel(backend),
      tools: [
        calculator,
        currentTime,
        weatherSpecialist.asTool({
          name: "weather_specialist",
          description: "Delegates a weather question (current conditions or station history) to a weather analyst agent",
        }),
      ],
      systemPrompt: "You coordinate specialists. Delegate weather questions to weather_specialist; do arithmetic yourself with calculator.",
    });

    console.log(`=== Multi-agent demo (${backend}) ===\n`);
    const result = await coordinator.invoke(prompt);
    console.log("\nAgent result:", result.toString());
  } finally {
    await weatherMcp?.client.disconnect();
  }
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
