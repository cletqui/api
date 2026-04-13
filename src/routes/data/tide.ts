import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getTideData, getHarboursData, getHarbourFromRequest } from "../../services/tide";

// ── Schemas ────────────────────────────────────────────────────────────────

const TideEntrySchema = z
  .object({
    type: z.enum(["high_tide", "low_tide"]).openapi({
      description: "Whether this is a high or low tide",
    }),
    time: z.string().openapi({ example: "14h30" }),
    high: z.string().openapi({ example: "7,20m", description: "Water height" }),
    coeff: z.string().optional().openapi({
      description: "Tidal coefficient 0–120 (high tides only)",
    }),
    coeff_label: z
      .enum(["morte-eau", "normale", "vive-eau", "vive-eau exceptionnelle"])
      .nullable()
      .optional()
      .openapi({
        description:
          "Tidal range label: morte-eau (≤45), normale (≤70), vive-eau (≤95), vive-eau exceptionnelle (>95)",
      }),
    timestamp: z.string().openapi({ example: "13/04/2026 14:30:00" }),
  })
  .openapi("TideEntry");

const DayForecastSchema = z.object({
  date_index: z.string().optional(),
  date: z.string().openapi({ example: "lundi 13 avril 2026" }),
  tide_data: z.array(TideEntrySchema),
});

const TideResponseSchema = z
  .object({
    id: z.string().openapi({ description: "Harbour ID from maree.info" }),
    name: z.string().openapi({ description: "Harbour name" }),
    cached: z.boolean().openapi({
      description: "True if raw tide data was served from KV cache",
    }),
    forecast: DayForecastSchema.openapi({ description: "Current day" }),
    last_tide: TideEntrySchema.nullable().openapi({
      description:
        "Most recently passed tide. Falls back to the previous scrape cycle before the day's first tide.",
    }),
    next_tide: TideEntrySchema.nullable().openapi({
      description: "Next upcoming tide",
    }),
    data: z.record(z.string(), DayForecastSchema),
  })
  .openapi("TideResponse");

const HarbourSchema = z
  .object({ id: z.union([z.string(), z.number()]), name: z.string() })
  .openapi("Harbour");

const HarbourSearchResponseSchema = z
  .union([
    z.object({ harbour: HarbourSchema }),
    z.object({
      availableHarbours: z.array(z.object({ harbour: HarbourSchema.nullable() })),
      nearHarbours: z.array(z.object({ harbour: HarbourSchema.nullable() })),
    }),
  ])
  .openapi("HarbourSearchResponse");

// ── Routes ─────────────────────────────────────────────────────────────────

export const tide = new OpenAPIHono();

// GET /data/tide
tide.openapi(
  createRoute({
    method: "get",
    path: "/tide",
    tags: ["Tide"],
    summary: "Get tide data for a harbour",
    description:
      "Returns a full week of tide predictions plus `last_tide` and `next_tide` " +
      "relative to the current time. Raw data is cached in KV for 12 hours; " +
      "last/next are always computed fresh.",
    request: {
      query: z.object({
        harbour: z.string().optional().openapi({
          description: "Harbour name — use either this or `id`, not both",
        }),
        id: z.string().optional().openapi({
          description: "Harbour ID from maree.info",
        }),
      }),
    },
    responses: {
      200: {
        content: { "application/json": { schema: TideResponseSchema } },
        description: "Tide data",
      },
      400: { description: "Bad request" },
      404: { description: "Harbour not found" },
    },
  }),
  async (c: any) => {
    const { harbour, id } = c.req.valid("query");

    if (harbour && id)
      return c.text("Cannot use harbour and id at the same time.", 400);
    if (!harbour && !id)
      return c.text("Missing harbour or id parameter.", 400);

    try {
      return c.json(await getTideData(c.req.raw, c.env));
    } catch (err: any) {
      return c.text(err.message, err.status ?? 500);
    }
  }
);

// GET /data/tide/harbours
tide.openapi(
  createRoute({
    method: "get",
    path: "/tide/harbours",
    tags: ["Tide"],
    summary: "List harbours or search by name / id",
    description:
      "Without parameters: returns all known harbours as an `id → name` map. " +
      "With `id` or `name`: searches D1 then falls back to maree.info. " +
      "Pass `?refresh` to force-sync the D1 registry from maree.info.",
    request: {
      query: z.object({
        id: z.string().optional().openapi({ description: "Filter by harbour ID" }),
        name: z.string().optional().openapi({ description: "Filter by name" }),
        refresh: z.string().optional().openapi({
          description: "Pass any value to re-scrape and sync the harbour list",
        }),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.union([
              z.record(z.string(), z.string()),
              HarbourSearchResponseSchema,
            ]),
          },
        },
        description: "Harbour list or search result",
      },
      404: { description: "Harbour not found" },
    },
  }),
  async (c: any) => {
    const { id, name } = c.req.valid("query");

    if (id || name) {
      try {
        const result = await getHarbourFromRequest(c.req.raw, c.env);
        if (!result) return c.json({ error: "Harbour not found" }, 404);
        return c.json(result);
      } catch (err: any) {
        return c.text(err.message, err.status ?? 500);
      }
    }

    try {
      return c.json(await getHarboursData(c.req.raw, c.env));
    } catch (err: any) {
      return c.text(err.message, err.status ?? 500);
    }
  }
);
