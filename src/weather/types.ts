// Returned by the current-observations endpoint (/v2/pws/observations/current).
export interface Metric {
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

export interface Observation {
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

export interface CurrentResponse {
  observations: Observation[];
}

// Returned by the daily-history endpoint (/v2/pws/history/daily). Field naming
// differs from Metric: suffixed High/Low/Avg instead of a flat structure.
export interface DailyMetric {
  tempHigh: number;
  tempLow: number;
  tempAvg: number;
  windspeedHigh: number;
  windspeedLow: number;
  windspeedAvg: number;
  windgustHigh: number;
  windgustLow: number;
  windgustAvg: number;
  dewptHigh: number;
  dewptLow: number;
  dewptAvg: number;
  windchillHigh: number;
  windchillLow: number;
  windchillAvg: number;
  heatindexHigh: number;
  heatindexLow: number;
  heatindexAvg: number;
  pressureMax: number;
  pressureMin: number;
  pressureTrend: number;
  precipRate: number;
  precipTotal: number;
}

export interface DailySummary {
  stationID: string;
  obsTimeLocal: string;
  humidityHigh: number;
  humidityLow: number;
  humidityAvg: number;
  uvHigh: number;
  solarRadiationHigh: number;
  winddirAvg: number;
  metric: DailyMetric;
}

export interface DailySummaryResponse {
  summaries: DailySummary[];
}

// Subset of Metric: the hourly endpoint returns fewer fields than current-observations.
export interface HourlyObservation {
  obsTimeLocal: string;
  metric: {
    temp: number;
    precipTotal: number;
    windSpeed: number;
    pressure: number;
  };
  humidity: number;
}

export interface HourlyResponse {
  observations: HourlyObservation[];
}
