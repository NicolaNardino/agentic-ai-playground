// Chat plumbing shared by the HTTP routes: request validation, per-session agents, and the
// mapping from Strands stream events to the small event protocol the UI consumes.
import type { Agent, AgentResult, AgentStreamEvent, Message } from "@strands-agents/sdk";
import { BACKENDS, isBackend, type Backend } from "./models.js";

export const MAX_SESSIONS = 100;
/** Tool output shown in the UI is capped; the model still receives the full result. */
export const TOOL_OUTPUT_PREVIEW_CHARS = 2000;

export interface ChatRequest {
  prompt: string;
  backend: Backend;
  sessionId?: string;
}

export interface ChatRequestError {
  error: string;
}

export function parseChatRequest(body: unknown): ChatRequest | ChatRequestError {
  const { prompt, backend = "anthropic", sessionId } = (body ?? {}) as Record<string, unknown>;
  if (!prompt || typeof prompt !== "string") return { error: "prompt is required" };
  if (!isBackend(backend)) return { error: `backend must be one of: ${BACKENDS.join(", ")}` };
  if (sessionId !== undefined && (typeof sessionId !== "string" || !sessionId)) {
    return { error: "sessionId must be a non-empty string" };
  }
  return { prompt, backend, sessionId };
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface TextEvent {
  type: "text";
  text: string;
}

export interface ToolStartEvent {
  type: "tool_start";
  id: string;
  name: string;
  input: unknown;
}

export interface ToolEndEvent {
  type: "tool_end";
  id: string;
  status: "success" | "error";
  output: string;
}

export interface DoneEvent {
  type: "done";
  durationMs: number;
  usage?: TokenUsage;
}

export interface ErrorEvent {
  type: "error";
  error: string;
}

export type ChatEvent = TextEvent | ToolStartEvent | ToolEndEvent | DoneEvent | ErrorEvent;

function preview(text: string): string {
  return text.length > TOOL_OUTPUT_PREVIEW_CHARS ? `${text.slice(0, TOOL_OUTPUT_PREVIEW_CHARS)}…` : text;
}

/** Maps a Strands stream event to a chat event, or null for events the UI doesn't show. */
export function toChatEvent(event: AgentStreamEvent): ChatEvent | null {
  switch (event.type) {
    case "modelStreamUpdateEvent": {
      const e = event.event;
      if (e.type === "modelContentBlockDeltaEvent" && e.delta.type === "textDelta") {
        return { type: "text", text: e.delta.text };
      }
      return null;
    }
    case "beforeToolCallEvent":
      return { type: "tool_start", id: event.toolUse.toolUseId, name: event.toolUse.name, input: event.toolUse.input };
    case "afterToolCallEvent": {
      const output = event.result.content
        .map((c) => (c.type === "textBlock" ? c.text : c.type === "jsonBlock" ? JSON.stringify(c.json) : `[${c.type}]`))
        .join("\n");
      return { type: "tool_end", id: event.toolUse.toolUseId, status: event.result.status, output: preview(output) };
    }
    default:
      return null;
  }
}

export function usageOf(result: AgentResult): TokenUsage | undefined {
  const usage = result.metrics?.accumulatedUsage;
  return usage ? { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens } : undefined;
}

export type AgentFactory = (backend: Backend, messages: Message[]) => Agent | Promise<Agent>;

interface Session {
  backend: Backend;
  agent: Agent;
}

/**
 * Keeps one agent per chat session so follow-up prompts see the conversation so far.
 * Switching backend mid-session builds a new agent seeded with the existing history.
 * Least-recently-used sessions are evicted beyond `maxSessions`.
 */
export class ChatSessions {
  private readonly sessions = new Map<string, Session>();

  constructor(
    private readonly createAgent: AgentFactory,
    private readonly maxSessions = MAX_SESSIONS,
  ) {}

  get size(): number {
    return this.sessions.size;
  }

  async get(sessionId: string, backend: Backend): Promise<Agent> {
    const existing = this.sessions.get(sessionId);
    const agent =
      existing?.backend === backend ? existing.agent : await this.createAgent(backend, existing?.agent.messages ?? []);
    // Only replaced once the agent exists, so a failed backend switch keeps the history.
    this.sessions.delete(sessionId); // re-inserted, so Map order tracks recency
    this.sessions.set(sessionId, { backend, agent });
    if (this.sessions.size > this.maxSessions) {
      this.sessions.delete(this.sessions.keys().next().value!);
    }
    return agent;
  }
}
