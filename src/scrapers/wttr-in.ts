/**
 * Fetches weather data from wttr.in for a given location.
 * Returns parsed JSON in wttr.in j1 format.
 */
export async function fetchWeatherData(location: string): Promise<unknown> {
  const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
}
