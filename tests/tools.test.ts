import { describe, it, expect, vi, afterEach } from "vitest";
import { calculator, currentTime } from "../src/tools.js";

describe("calculator", () => {
  it("adds two numbers", async () => {
    expect(await calculator.invoke({ operation: "add", a: 3, b: 4 })).toBe("7");
  });

  it("subtracts", async () => {
    expect(await calculator.invoke({ operation: "subtract", a: 10, b: 3 })).toBe("7");
  });

  it("multiplies", async () => {
    expect(await calculator.invoke({ operation: "multiply", a: 6, b: 7 })).toBe("42");
  });

  it("divides", async () => {
    expect(await calculator.invoke({ operation: "divide", a: 10, b: 2 })).toBe("5");
  });

  it("returns error on division by zero", async () => {
    expect(await calculator.invoke({ operation: "divide", a: 5, b: 0 })).toBe("Error: division by zero");
  });

  it("handles negative numbers", async () => {
    expect(await calculator.invoke({ operation: "add", a: -3, b: -4 })).toBe("-7");
  });

  it("handles floating point", async () => {
    expect(await calculator.invoke({ operation: "divide", a: 1, b: 4 })).toBe("0.25");
  });
});

describe("currentTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a valid ISO timestamp", async () => {
    const before = Date.now();
    const result = await currentTime.invoke({});
    const after = Date.now();
    const ts = new Date(result as string).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("reflects mocked system time", async () => {
    vi.useFakeTimers();
    const fixed = new Date("2025-01-15T12:00:00.000Z");
    vi.setSystemTime(fixed);
    const result = await currentTime.invoke({});
    expect(result).toBe("2025-01-15T12:00:00.000Z");
  });
});
