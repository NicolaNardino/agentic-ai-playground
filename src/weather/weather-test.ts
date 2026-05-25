// Weather Underground API helpers — fetch and print current, hourly, and daily data.
// Requires: WU_API_KEY, WU_STATION_ID

import type { CurrentResponse, DailySummaryResponse, HourlyResponse } from "./types.js";

const WU_BASE_URL = "https://api.weather.com";

/** Reads an env var and exits with an error message if it is missing. */
export function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`Error: ${name} environment variable is required`);
    process.exit(1);
  }
  return val;
}

async function wuFetch(path: string, params: Record<string, string>): Promise<unknown> {
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

function windDirectionLabel(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16]; // 360° / 16 points = 22.5° per sector
}

/** Fetches and prints the latest observation for the given PWS station. */
export async function testCurrentConditions(stationId: string): Promise<void> {
  console.log(`\n=== Current Conditions — Station ${stationId} ===`);
  const data = await wuFetch("/v2/pws/observations/current", { stationId, units: "m" }) as CurrentResponse;

  if (!data.observations?.length) {
    console.log("No observations returned.");
    return;
  }

  const obs = data.observations[0];
  const m = obs.metric;

  console.log(`Station:       ${obs.stationID} (${obs.neighborhood}, ${obs.country})`);
  console.log(`Time:          ${obs.obsTimeLocal}`);
  console.log(`Temperature:   ${m.temp}°C  (feels like: ${m.heatIndex ?? m.windChill}°C)`);
  console.log(`Dew point:     ${m.dewpt}°C`);
  console.log(`Humidity:      ${obs.humidity}%`);
  console.log(`Wind:          ${m.windSpeed} km/h ${windDirectionLabel(obs.winddir)} (gusts: ${m.windGust} km/h)`);
  console.log(`Pressure:      ${m.pressure} hPa`);
  console.log(`Precip rate:   ${m.precipRate} mm/hr  (total: ${m.precipTotal} mm)`);
  console.log(`UV index:      ${obs.uv}`);
  console.log(`Solar rad:     ${obs.solarRadiation} W/m²`);
  console.log(`Elevation:     ${m.elev} m`);
}

function printDailySummaryTable(summaries: DailySummaryResponse["summaries"]): void {
  console.log("Date        Temp hi/lo/avg °C   Hum avg%  Wind hi/avg km/h  Precip mm  UV hi");
  console.log("─".repeat(78));
  for (const s of summaries) {
    const m = s.metric;
    const date = s.obsTimeLocal.slice(0, 10);
    const temp = `${m.tempHigh}/${m.tempLow}/${m.tempAvg}`.padEnd(18);
    const hum = String(s.humidityAvg).padStart(5);
    const wind = `${m.windspeedHigh}/${m.windspeedAvg}`.padEnd(16);
    const precip = String(m.precipTotal).padStart(9);
    const uv = String(s.uvHigh).padStart(5);
    console.log(`${date}  ${temp}  ${hum}  ${wind}  ${precip}  ${uv}`);
  }
}

/** Fetches and prints the last 7 days of daily summaries for the given PWS station. */
export async function getDailySummaries(stationId: string): Promise<void> {
  console.log(`\n=== Daily Summaries (last 7 days) — Station ${stationId} ===`);

  const data = await wuFetch("/v2/pws/dailysummary/7day", {
    stationId,
    units: "m",
  }) as DailySummaryResponse;

  if (!data.summaries?.length) {
    console.log("No daily summaries returned.");
    return;
  }

  printDailySummaryTable(data.summaries);
}

/** Fetches and prints the daily summary for a specific date (YYYYMMDD, defaults to yesterday).
 *  Note: requires a paid WU API subscription — free PWS-owner keys only cover the 7-day endpoint. */
export async function getDailySummary(stationId: string, date?: string): Promise<void> {
  // Default to yesterday: today's daily summary is incomplete until midnight
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDate = date ?? yesterday.toISOString().slice(0, 10).replace(/-/g, "");
  console.log(`\n=== Daily Summary — Station ${stationId} — ${targetDate} ===`);

  const data = await wuFetch("/v2/pws/history/daily", {
    stationId,
    units: "m",
    date: targetDate,
  }) as DailySummaryResponse;

  if (!data.summaries?.length) {
    console.log("No daily summary returned. This endpoint may require a paid API subscription.");
    return;
  }

  printDailySummaryTable(data.summaries);
}

/** Fetches and prints the last 24 hours of hourly observations for the given PWS station. */
export async function testHourlyHistory(stationId: string): Promise<void> {
  console.log(`\n=== Last 24 Hours (hourly) — Station ${stationId} ===`);
  const data = await wuFetch("/v2/pws/observations/hourly/7day", { stationId, units: "m" }) as HourlyResponse;

  if (!data.observations?.length) {
    console.log("No observations returned.");
    return;
  }

  const recent = data.observations.slice(-24); // endpoint returns up to 7 days; we show only the last 24h
  console.log("Time                 Temp°C  Hum%  Wind km/h  Precip mm  Press hPa");
  console.log("─".repeat(68));
  for (const obs of recent) {
    const m = obs.metric;
    console.log(
      `${obs.obsTimeLocal.padEnd(20)} ${String(m.temp).padStart(6)}  ${String(obs.humidity).padStart(4)}  ${String(m.windSpeed).padStart(9)}  ${String(m.precipTotal).padStart(9)}  ${String(m.pressure).padStart(9)}`
    );
  }
}
