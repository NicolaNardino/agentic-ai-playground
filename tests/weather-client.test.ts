import { describe, it, expect, afterEach, vi } from "vitest";
import { requireEnv, wuFetch, WU_BASE_URL } from "../src/weather/client.js";
import { stubFetch } from "./helpers/fetch-stub.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("requireEnv", () => {
  it("returns the value when set", () => {
    vi.stubEnv("SOME_VAR", "x");
    expect(requireEnv("SOME_VAR")).toBe("x");
  });

  it("throws when missing", () => {
    vi.stubEnv("SOME_VAR", "");
    expect(() => requireEnv("SOME_VAR")).toThrow("SOME_VAR environment variable is required");
  });
});

describe("wuFetch", () => {
  it("adds the API key and default params, and parses JSON", async () => {
    vi.stubEnv("WU_API_KEY", "key123");
    const urls = stubFetch({ observations: [] });

    expect(await wuFetch("/v2/pws/observations/current", { stationId: "IBAAR1", units: "m" })).toEqual({ observations: [] });

    const url = new URL(urls[0]);
    expect(url.origin + url.pathname).toBe(`${WU_BASE_URL}/v2/pws/observations/current`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      apiKey: "key123",
      format: "json",
      numericPrecision: "decimal",
      stationId: "IBAAR1",
      units: "m",
    });
  });

  it("throws with the status and body on HTTP errors", async () => {
    vi.stubEnv("WU_API_KEY", "key123");
    stubFetch("Unauthorized", { status: 401 });
    await expect(wuFetch("/x", {})).rejects.toThrow("Weather Underground API 401: Unauthorized");
  });

  it("fails before calling the API when WU_API_KEY is missing", async () => {
    vi.stubEnv("WU_API_KEY", "");
    const urls = stubFetch({});
    await expect(wuFetch("/x", {})).rejects.toThrow("WU_API_KEY");
    expect(urls).toHaveLength(0);
  });
});
