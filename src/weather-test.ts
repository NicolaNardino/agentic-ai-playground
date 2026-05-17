/**
 * Direct Weather Underground API test — no MCP server required.
 * Set WU_API_KEY and WU_STATION_ID in your environment (or .env), then run:
 *   npm run weather:test
 */

const WU_BASE_URL = "https://api.weather.com";

function requireEnv(name: string): string {
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
  url.searchParams.set("numericPrecision", "decimal");
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

interface Metric {
  temp: number;
  heatIndex: number;
  dewpt: number;
  windChill: number;
  windSpeed: number;
  windGust: number;
  pressure: number;
  precipRate: number;
  precipTotal: number;
  elev: number;
}

interface Observation {
  stationID: string;
  obsTimeLocal: string;
  neighborhood: string;
  country: string;
  humidity: number;
  uv: number;
  winddir: number;
  solarRadiation: number;
  metric: Metric;
}

interface CurrentResponse {
  observations: Observation[];
}

function windDirectionLabel(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

async function testCurrentConditions(stationId: string): Promise<void> {
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

interface HourlyObservation {
  obsTimeLocal: string;
  metric: {
    temp: number;
    precipTotal: number;
    windSpeed: number;
    pressure: number;
  };
  humidity: number;
}

interface HourlyResponse {
  observations: HourlyObservation[];
}

async function testHourlyHistory(stationId: string): Promise<void> {
  console.log(`\n=== Last 24 Hours (hourly) — Station ${stationId} ===`);
  const data = await wuFetch("/v2/pws/observations/hourly/7day", { stationId, units: "m" }) as HourlyResponse;

  if (!data.observations?.length) {
    console.log("No observations returned.");
    return;
  }

  // Show most recent 24 entries
  const recent = data.observations.slice(-24);
  console.log("Time                 Temp°C  Hum%  Wind km/h  Precip mm  Press hPa");
  console.log("─".repeat(68));
  for (const obs of recent) {
    const m = obs.metric;
    console.log(
      `${obs.obsTimeLocal.padEnd(20)} ${String(m.temp).padStart(6)}  ${String(obs.humidity).padStart(4)}  ${String(m.windSpeed).padStart(9)}  ${String(m.precipTotal).padStart(9)}  ${String(m.pressure).padStart(9)}`
    );
  }
}

async function main(): Promise<void> {
  const stationId = requireEnv("WU_STATION_ID");

  console.log("Weather Underground API Test");
  console.log("============================");

  await testCurrentConditions(stationId);
  await testHourlyHistory(stationId);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
