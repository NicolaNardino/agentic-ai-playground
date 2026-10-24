// Entry point — lists the runnable npm scripts.

console.log("Strands Agents Experiments");
console.log("==========================");
console.log("  npm run strands         — Strands agent (Anthropic) + Weather MCP tools");
console.log("  npm run ollama          — Strands agent via local Ollama");
console.log("  npm run multi-agent     — coordinator agent delegating to a weather specialist agent");
console.log("  npm run compare         — same prompt on every backend: latency, tokens, answers");
console.log("  npm run server          — Express chat API on port 3001");
console.log("  npm run weather:server  — Weather Underground MCP server on port 3003");
console.log("  npm run weather:test    — direct Weather Underground API test");
console.log("  npm test                — run unit tests");
