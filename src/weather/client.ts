// Shared Weather Underground (IBM Weather Company) API client — used by the MCP server and the CLI test.

export const WU_BASE_URL = "https://api.weather.com";

/** Reads an env var and throws if it is missing. */
export function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`${name} environment variable is required`);
  return val;
}

export async function wuFetch(path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`${WU_BASE_URL}${path}`);
  url.searchParams.set("apiKey", requireEnv("WU_API_KEY"));
  url.searchParams.set("format", "json");
  url.searchParams.set("numericPrecision", "decimal"); // omitting this returns integers for temp/pressure
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Weather Underground API ${res.status}: ${body}`);
  }
  return res.json();
}
