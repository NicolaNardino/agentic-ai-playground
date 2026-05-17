// Express HTTP API — POST /api/chat proxies prompts to a Strands agent.
// Supports a "backend" field in the request body: "bedrock" (default) or "ollama".
import express from "express";
import cors from "cors";
import { Agent } from "@strands-agents/sdk";
import { calculator, currentTime } from "./tools.js";
import { makeBedrockModel, makeOllamaModel } from "./models.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const { prompt, backend = "bedrock" } = req.body as {
    prompt: string;
    backend?: "bedrock" | "ollama";
  };

  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  try {
    const model = backend === "ollama" ? makeOllamaModel() : makeBedrockModel();
    const agent = new Agent({ model, tools: [calculator, currentTime] });
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
