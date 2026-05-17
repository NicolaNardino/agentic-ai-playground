// Model factory functions for all supported backends: Bedrock, Anthropic, and Ollama.
import { BedrockModel } from "@strands-agents/sdk";
import { AnthropicModel } from "@strands-agents/sdk/models/anthropic";
// Ollama exposes an OpenAI-compatible /v1 API, so Strands' OpenAIModel is used to reach it.
import { OpenAIModel } from "@strands-agents/sdk/models/openai";

export interface OllamaConfig {
  host?: string;
  model?: string;
}

export interface BedrockConfig {
  modelId?: string;
}

export const OLLAMA_DEFAULT_MODEL = "qwen3:8b";
export const BEDROCK_DEFAULT_MODEL = "us.anthropic.claude-sonnet-4-5";
export const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-6";

export function makeOllamaModel(config: OllamaConfig = {}): OpenAIModel {
  const host  = config.host  ?? process.env.OLLAMA_HOST  ?? "http://localhost:11434";
  const model = config.model ?? process.env.OLLAMA_MODEL ?? OLLAMA_DEFAULT_MODEL;
  return new OpenAIModel({
    api: "chat",
    modelId: model,
    apiKey: "ollama", // Ollama ignores the key but the OpenAI client refuses an empty string
    clientConfig: {
      baseURL: `${host}/v1`,
    },
  });
}

export function makeBedrockModel(config: BedrockConfig = {}): BedrockModel {
  return new BedrockModel({
    modelId: config.modelId ?? process.env.STRANDS_MODEL_ID ?? BEDROCK_DEFAULT_MODEL,
  });
}

export interface AnthropicConfig {
  modelId?: string;
}

export function makeAnthropicModel(config: AnthropicConfig = {}): AnthropicModel {
  return new AnthropicModel({
    modelId: config.modelId ?? process.env.ANTHROPIC_MODEL_ID ?? ANTHROPIC_DEFAULT_MODEL,
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}
