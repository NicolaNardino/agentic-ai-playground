// Replaces global fetch with a stub that records request URLs and returns one canned response.
import { vi } from "vitest";

export function stubFetch(body: string | object, init: { status?: number; contentType?: string } = {}): string[] {
  const urls: string[] = [];
  const text = typeof body === "string" ? body : JSON.stringify(body);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      urls.push(String(input));
      return new Response(text, {
        status: init.status ?? 200,
        headers: { "content-type": init.contentType ?? (typeof body === "string" ? "text/plain" : "application/json") },
      });
    }),
  );
  return urls;
}
