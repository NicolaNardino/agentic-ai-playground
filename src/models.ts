import { BedrockModel } from "@strands-agents/sdk";
import { AnthropicModel } from "@strands-agents/sdk/models/anthropic";

export interface BedrockConfig {
  modelId?: string;
}

export const BEDROCK_DEFAULT_MODEL = "us.anthropic.claude-sonnet-4-5";
export const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-6";

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
