import { describe, it, expect, afterEach } from "vitest";
import {
  makeOllamaModel,
  makeBedrockModel,
  makeModel,
  isBackend,
  BACKENDS,
  OLLAMA_DEFAULT_MODEL,
  BEDROCK_DEFAULT_MODEL,
  ANTHROPIC_DEFAULT_MODEL,
} from "../src/models.js";

describe("makeOllamaModel", () => {
  afterEach(() => {
    delete process.env.OLLAMA_MODEL;
    delete process.env.OLLAMA_HOST;
  });

  it(`defaults to ${OLLAMA_DEFAULT_MODEL}`, () => {
    const model = makeOllamaModel();
    expect(model.modelId).toBe(OLLAMA_DEFAULT_MODEL);
  });

  it("accepts a custom model via config", () => {
    const model = makeOllamaModel({ model: "qwen3:14b" });
    expect(model.modelId).toBe("qwen3:14b");
  });

  it("reads OLLAMA_MODEL from environment", () => {
    process.env.OLLAMA_MODEL = "qwen3:32b";
    const model = makeOllamaModel();
    expect(model.modelId).toBe("qwen3:32b");
  });

  it("config takes precedence over environment", () => {
    process.env.OLLAMA_MODEL = "qwen3:32b";
    const model = makeOllamaModel({ model: "qwen3:4b" });
    expect(model.modelId).toBe("qwen3:4b");
  });
});

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

describe("makeModel", () => {
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("builds the model for each backend", () => {
    process.env.ANTHROPIC_API_KEY = "test-key"; // the Anthropic provider rejects a missing key at construction
    expect(makeModel("ollama").modelId).toBe(OLLAMA_DEFAULT_MODEL);
    expect(makeModel("bedrock").modelId).toBe(BEDROCK_DEFAULT_MODEL);
    expect(makeModel("anthropic").modelId).toBe(ANTHROPIC_DEFAULT_MODEL);
  });
});

describe("isBackend", () => {
  it("accepts every known backend", () => {
    for (const b of BACKENDS) expect(isBackend(b)).toBe(true);
  });

  it("rejects unknown values", () => {
    expect(isBackend("openai")).toBe(false);
    expect(isBackend(undefined)).toBe(false);
  });
});
