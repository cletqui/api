import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getWeatherData } from "../../services/weather";

export const weather = new OpenAPIHono();

weather.openapi(
  createRoute({
    method: "get",
    path: "/weather",
    tags: ["Weather"],
    summary: "Get weather data",
    description:
      "Returns weather data from wttr.in. Pass `?location=` to specify a city; " +
      "omit it to use Cloudflare's geolocation (req.cf.city).",
    request: {
      query: z.object({
        location: z.string().optional().openapi({
          description: "City or location name. Falls back to request geolocation if omitted.",
          example: "Paris",
        }),
      }),
    },
    responses: {
      200: {
        content: { "application/json": { schema: z.any() } },
        description: "Weather data in wttr.in j1 format",
      },
    },
  }),
  async (c: any) => {
    try {
      return c.json(await getWeatherData(c.req.raw, c.env));
    } catch (err: any) {
      return c.text(err.message, err.status ?? 500);
    }
  }
);
