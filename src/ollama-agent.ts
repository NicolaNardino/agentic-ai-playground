// Minimal agent script: Ollama model with built-in tools only, no MCP server needed.
import { Agent } from "@strands-agents/sdk";
import { calculator, currentTime } from "./tools.js";
import { makeOllamaModel, OLLAMA_DEFAULT_MODEL } from "./models.js";

async function main() {
  const model = makeOllamaModel();
  const agent = new Agent({
    model,
    tools: [calculator, currentTime],
  });

  const modelId = model.modelId ?? OLLAMA_DEFAULT_MODEL;
  console.log(`=== Ollama Agent via Strands (${modelId}) ===\n`);

  const result = await agent.invoke(
    "What is 42 multiplied by 7? Also, what time is it right now?"
  );

  console.log("Agent result:", result.toString());
}

main().catch(console.error);
