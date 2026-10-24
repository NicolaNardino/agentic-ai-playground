// Runs the same prompt on every backend and compares latency, token use and answers.
// Backends without credentials (or a running Ollama) are reported as failed, not fatal.
// Usage: npm run compare -- ["prompt"]
import { Agent } from "@strands-agents/sdk";
import { calculator, currentTime } from "./tools.js";
import { BACKENDS, makeModel, type Backend } from "./models.js";
import { usageOf, type TokenUsage } from "./chat.js";

const DEFAULT_PROMPT = "What is 42 multiplied by 7? Answer in one sentence.";

interface BackendRun {
  backend: Backend;
  seconds: number;
  answer?: string;
  usage?: TokenUsage;
  error?: string;
}

async function run(backend: Backend, prompt: string): Promise<BackendRun> {
  const started = Date.now();
  const seconds = () => (Date.now() - started) / 1000;
  try {
    const agent = new Agent({ model: makeModel(backend), tools: [calculator, currentTime], printer: false });
    const result = await agent.invoke(prompt);
    return { backend, seconds: seconds(), answer: result.toString().trim(), usage: usageOf(result) };
  } catch (err) {
    return { backend, seconds: seconds(), error: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const prompt = process.argv[2] ?? DEFAULT_PROMPT;
  console.log(`Prompt: ${prompt}\n`);

  const runs: BackendRun[] = [];
  for (const backend of BACKENDS) runs.push(await run(backend, prompt)); // sequential, so timings don't interfere

  console.log("Backend     Status  Time s  In tok  Out tok");
  console.log("─".repeat(44));
  for (const r of runs) {
    console.log(
      `${r.backend.padEnd(10)}  ${(r.error ? "failed" : "ok").padEnd(6)}  ${r.seconds.toFixed(1).padStart(6)}  ` +
        `${String(r.usage?.inputTokens ?? "-").padStart(6)}  ${String(r.usage?.outputTokens ?? "-").padStart(7)}`
    );
  }
  for (const r of runs) {
    console.log(`\n--- ${r.backend} ---\n${r.error ? `Error: ${r.error}` : r.answer}`);
  }
}

main().catch(console.error);
