import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import aperoData from "../../data/apero.json";

// ── Schemas ────────────────────────────────────────────────────────────────

const AperoInfoSchema = z
  .object({
    time: z.string().openapi({ example: "18:30", description: "Local apéro time (HH:mm)" }),
    drinks: z.array(z.string()),
    snacks: z.array(z.string()),
    brands: z.array(z.string()),
    toast: z.array(z.string()),
    tradition: z.string(),
  })
  .openapi("AperoInfo");

const CountryInfoSchema = z
  .object({
    name: z.string(),
    capital: z.string(),
    language: z.string(),
    currency: z.string(),
    majorCities: z.array(z.string()),
  })
  .openapi("CountryInfo");

const TimezoneEntrySchema = z
  .object({
    timeZone: z.string().openapi({ example: "Europe/Paris" }),
    countryInfo: CountryInfoSchema,
    aperoInfo: AperoInfoSchema,
  })
  .openapi("TimezoneEntry");

// ── Routes ─────────────────────────────────────────────────────────────────

export const apero = new OpenAPIHono();

// GET /data/apero
apero.openapi(
  createRoute({
    method: "get",
    path: "/apero",
    tags: ["Apero"],
    summary: "Get apéro data",
    description:
      "Returns the full apéro dataset keyed by continent and city. " +
      "Pass `?timezone=Continent/City` to retrieve a single entry.",
    request: {
      query: z.object({
        timezone: z.string().optional().openapi({
          description: "IANA timezone (e.g. Europe/Paris)",
          example: "Europe/Paris",
        }),
      }),
    },
    responses: {
      200: {
        content: { "application/json": { schema: z.any() } },
        description: "Apéro data",
      },
      404: { description: "Timezone not found or not yet in dataset" },
    },
  }),
  async (c: any) => {
    const { timezone } = c.req.valid("query");

    if (timezone) {
      const [continent, city] = timezone.split("/");
      const entry = (aperoData as any)[continent]?.[city];

      if (!entry || Object.keys(entry).length === 0) {
        return c.text(`Timezone ${timezone} not found in apéro dataset.`, 404);
      }

      return c.json(entry);
    }

    return c.json(aperoData);
  }
);
