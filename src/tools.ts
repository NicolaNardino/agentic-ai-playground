// Shared Strands tool definitions — imported by agent scripts and unit tests.
import { tool } from "@strands-agents/sdk";
import { z } from "zod";

export const calculator = tool({
  name: "calculator",
  description: "Performs basic arithmetic operations",
  inputSchema: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number(),
    b: z.number(),
  }),
  callback: ({ operation, a, b }) => {
    switch (operation) {
      case "add":      return String(a + b);
      case "subtract": return String(a - b);
      case "multiply": return String(a * b);
      case "divide":
        if (b === 0) return "Error: division by zero";
        return String(a / b);
    }
  },
});

export const currentTime = tool({
  name: "current_time",
  description: "Returns the current date and time as an ISO string",
  inputSchema: z.object({}),
  callback: () => new Date().toISOString(),
});
