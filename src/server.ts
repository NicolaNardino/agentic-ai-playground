// Express HTTP API — POST /api/chat proxies prompts to a Strands agent.
// Supports a "backend" field in the request body: "anthropic" (default), "ollama", or "bedrock".
import express from "express";
import cors from "cors";
import { Agent } from "@strands-agents/sdk";
import { calculator, currentTime } from "./tools.js";
import { BACKENDS, isBackend, makeModel } from "./models.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const { prompt, backend = "anthropic" } = req.body as { prompt?: unknown; backend?: unknown };

  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "prompt is required" });
    return;
  }
  if (!isBackend(backend)) {
    res.status(400).json({ error: `backend must be one of: ${BACKENDS.join(", ")}` });
    return;
  }

  try {
    const agent = new Agent({ model: makeModel(backend), tools: [calculator, currentTime] });
    const result = await agent.invoke(prompt);
    res.json({ response: result.toString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
