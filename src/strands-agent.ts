import { Agent } from "@strands-agents/sdk";
import { calculator, currentTime } from "./tools.js";
import { makeBedrockModel } from "./models.js";

async function main() {
  const agent = new Agent({
    model: makeBedrockModel(),
    tools: [calculator, currentTime],
  });

  console.log("=== Strands Agent (AWS Bedrock) ===\n");

  const result = await agent.invoke(
    "What is 42 multiplied by 7? Also, what time is it right now?"
  );

  console.log("Agent result:", result.toString());
}

main().catch(console.error);
