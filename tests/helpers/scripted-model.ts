// A fake Strands model that replays scripted turns, so agents can run in tests without an LLM.
import { Model, type BaseModelConfig, type Message, type ModelStreamEvent } from "@strands-agents/sdk";

export type Turn = { text: string } | { toolUse: { name: string; input: Record<string, unknown> } };

export const TURN_USAGE = { inputTokens: 10, outputTokens: 5, totalTokens: 15 };

export class ScriptedModel extends Model<BaseModelConfig> {
  private config: BaseModelConfig = { modelId: "scripted" };
  /** Number of messages the model saw on each call — lets tests check conversation memory. */
  readonly seenMessageCounts: number[] = [];

  constructor(private readonly turns: Turn[]) {
    super();
  }

  updateConfig(config: BaseModelConfig): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): BaseModelConfig {
    return this.config;
  }

  async *stream(messages: Message[]): AsyncIterable<ModelStreamEvent> {
    this.seenMessageCounts.push(messages.length);
    const turn = this.turns.shift();
    if (!turn) throw new Error("ScriptedModel: no turns left");

    yield { type: "modelMessageStartEvent", role: "assistant" };
    if ("text" in turn) {
      yield { type: "modelContentBlockStartEvent" };
      yield { type: "modelContentBlockDeltaEvent", delta: { type: "textDelta", text: turn.text } };
      yield { type: "modelContentBlockStopEvent" };
      yield { type: "modelMessageStopEvent", stopReason: "endTurn" };
    } else {
      const toolUseId = `tool-${this.seenMessageCounts.length}`;
      yield { type: "modelContentBlockStartEvent", start: { type: "toolUseStart", name: turn.toolUse.name, toolUseId } };
      yield { type: "modelContentBlockDeltaEvent", delta: { type: "toolUseInputDelta", input: JSON.stringify(turn.toolUse.input) } };
      yield { type: "modelContentBlockStopEvent" };
      yield { type: "modelMessageStopEvent", stopReason: "toolUse" };
    }
    yield { type: "modelMetadataEvent", usage: TURN_USAGE };
  }
}
