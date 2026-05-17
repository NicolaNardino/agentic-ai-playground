import { describe, it, expect } from "vitest";
import { Agent } from "@strands-agents/sdk";
import { calculator, currentTime } from "../src/tools.js";
import { makeOllamaModel, makeBedrockModel, OLLAMA_DEFAULT_MODEL, BEDROCK_DEFAULT_MODEL } from "../src/models.js";

describe("Agent construction", () => {
  it("registers tools by name", () => {
    const agent = new Agent({ tools: [calculator, currentTime] });
    const names = agent.tools.map((t) => t.name);
    expect(names).toContain("calculator");
    expect(names).toContain("current_time");
  });

  it("exposes the correct tool count", () => {
    const agent = new Agent({ tools: [calculator, currentTime] });
    expect(agent.tools).toHaveLength(2);
  });

  it("uses the Ollama/Qwen model when configured", () => {
    const model = makeOllamaModel();
    const agent = new Agent({ model, tools: [calculator, currentTime] });
    expect(agent.model.modelId).toBe(OLLAMA_DEFAULT_MODEL);
  });

  it("uses the Bedrock model when configured", () => {
    const model = makeBedrockModel();
    const agent = new Agent({ model, tools: [calculator, currentTime] });
    expect(agent.model.modelId).toBe(BEDROCK_DEFAULT_MODEL);
  });

  it("starts with an empty message history", () => {
    const agent = new Agent({ tools: [calculator] });
    expect(agent.messages).toHaveLength(0);
  });
});
