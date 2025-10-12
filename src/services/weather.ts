import { fetchWeatherData } from "../scrapers/wttr-in";

/**
 * Returns weather data for the location specified in the request.
 * Location is read from `?location=` or falls back to Cloudflare's
 * geolocation (req.cf.city).
 */
export async function getWeatherData(
  req: Request,
  env: unknown
): Promise<unknown> {
  const location = extractLocation(req);
  if (!location) return null;
  return fetchWeatherData(location);
}

function extractLocation(req: Request): string | null {
  const params = new URL(req.url).searchParams;
  const cf = (req as any).cf as { city?: string } | undefined;
  return params.get("location") ?? cf?.city ?? null;
}
