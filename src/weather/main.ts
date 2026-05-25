import { requireEnv, testCurrentConditions, testHourlyHistory, getDailySummaries, getDailySummary } from "./weather-test.js";

async function main(): Promise<void> {
  const stationId = requireEnv("WU_STATION_ID");

  console.log("Weather Underground API Test");
  console.log("============================");

  await testCurrentConditions(stationId);
  await testHourlyHistory(stationId);
  await getDailySummaries(stationId);
  await getDailySummary(stationId,'20260519');

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
