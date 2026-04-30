"use client";

import { useQuery } from "@tanstack/react-query";

// Open-Meteo is a free, key-less weather API. No registration needed; rate
// limit is generous for personal/family use.
// https://open-meteo.com/en/docs

export interface WeatherSnapshot {
  /** Current temperature in degrees F. */
  tempNow: number;
  /** Today's forecast high in degrees F. */
  high: number;
  /** Today's forecast low in degrees F. */
  low: number;
  /** WMO weather code (https://open-meteo.com/en/docs#weathervariables) */
  code: number;
  /** Human-readable label like "Partly cloudy". */
  label: string;
  /** Tidyboard Icon name that best matches the condition. */
  icon: "sun" | "cloud" | "moon";
}

/**
 * Maps an Open-Meteo WMO weather code to a label + icon. The icon set is
 * limited to what `@/components/ui/icon` ships today (sun/cloud/moon); rain
 * and storm conditions degrade to "cloud" so the layout doesn't break. Add
 * dedicated icons later if/when the design system grows.
 */
export function describeCode(code: number): { label: string; icon: WeatherSnapshot["icon"] } {
  if (code === 0) return { label: "Clear", icon: "sun" };
  if (code === 1) return { label: "Mainly clear", icon: "sun" };
  if (code === 2) return { label: "Partly cloudy", icon: "cloud" };
  if (code === 3) return { label: "Overcast", icon: "cloud" };
  if (code === 45 || code === 48) return { label: "Fog", icon: "cloud" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", icon: "cloud" };
  if (code >= 61 && code <= 67) return { label: "Rain", icon: "cloud" };
  if (code >= 71 && code <= 77) return { label: "Snow", icon: "cloud" };
  if (code >= 80 && code <= 82) return { label: "Showers", icon: "cloud" };
  if (code === 85 || code === 86) return { label: "Snow showers", icon: "cloud" };
  if (code === 95) return { label: "Thunderstorm", icon: "cloud" };
  if (code === 96 || code === 99) return { label: "Thunder + hail", icon: "cloud" };
  return { label: "—", icon: "cloud" };
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    weather_code: number;
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,weather_code",
    daily: "temperature_2m_max,temperature_2m_min",
    temperature_unit: "fahrenheit",
    forecast_days: "1",
    timezone: "auto",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`weather fetch failed: ${res.status}`);
  const json = (await res.json()) as OpenMeteoResponse;
  const desc = describeCode(json.current.weather_code);
  return {
    tempNow: Math.round(json.current.temperature_2m),
    high: Math.round(json.daily.temperature_2m_max[0]),
    low: Math.round(json.daily.temperature_2m_min[0]),
    code: json.current.weather_code,
    label: desc.label,
    icon: desc.icon,
  };
}

// Berkeley, CA — sample data shows the demo family lives there. Households
// will eventually carry their own lat/lon in settings; until then this is
// the fallback for any caller that doesn't pass coords.
const DEFAULT_COORDS = { lat: 37.8716, lon: -122.273 };

export function useWeather(
  coords?: { lat: number; lon: number },
  opts?: { enabled?: boolean }
) {
  const enabled = opts?.enabled ?? true;
  const effectiveCoords = coords ?? (enabled ? DEFAULT_COORDS : undefined);
  const { lat, lon } = effectiveCoords ?? { lat: 0, lon: 0 };
  return useQuery<WeatherSnapshot>({
    queryKey: ["weather", lat, lon],
    queryFn: () => {
      if (!effectiveCoords) {
        throw new Error("weather coordinates unavailable");
      }
      return fetchWeather(lat, lon);
    },
    // 15 minute cache — weather doesn't move that fast and we don't want to
    // hammer Open-Meteo on every dashboard render.
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    enabled,
  });
}
