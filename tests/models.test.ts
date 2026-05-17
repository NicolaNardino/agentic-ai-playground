import { describe, it, expect, afterEach } from "vitest";
import {
  makeBedrockModel,
  BEDROCK_DEFAULT_MODEL,
} from "../src/models.js";

describe("makeBedrockModel", () => {
  afterEach(() => {
    delete process.env.STRANDS_MODEL_ID;
  });

  it(`defaults to ${BEDROCK_DEFAULT_MODEL}`, () => {
    const model = makeBedrockModel();
    expect(model.modelId).toBe(BEDROCK_DEFAULT_MODEL);
  });

  it("accepts a custom model ID via config", () => {
    const model = makeBedrockModel({ modelId: "us.anthropic.claude-opus-4-7" });
    expect(model.modelId).toBe("us.anthropic.claude-opus-4-7");
  });

  it("reads STRANDS_MODEL_ID from environment", () => {
    process.env.STRANDS_MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001";
    const model = makeBedrockModel();
    expect(model.modelId).toBe("us.anthropic.claude-haiku-4-5-20251001");
  });
});
