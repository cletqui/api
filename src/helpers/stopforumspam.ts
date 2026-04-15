import { z, createRoute } from "@hono/zod-openapi";

// ── Types ──────────────────────────────────────────────────────────────────

export interface StopForumSpamResponse {
  appears: boolean;
  frequency: number;
  confidence: number | null;
  lastseen: string | null;
  torexit: boolean;
  asn: number | null;
  country: string | null;
}

// ── Query ──────────────────────────────────────────────────────────────────

interface RawIpEntry {
  value: string;
  appears: number;
  frequency: number;
  confidence?: number;
  lastseen?: string;
  torexit?: number;
  asn?: number;
  country?: string;
}

export async function query(ip: string): Promise<StopForumSpamResponse> {
  const url = `https://api.stopforumspam.org/api?ip=${encodeURIComponent(ip)}&json`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw Object.assign(
      new Error(`StopForumSpam lookup failed: ${response.status} ${response.statusText}`),
      { status: response.status }
    );
  }
  const json = (await response.json()) as { success: number; ip: RawIpEntry };
  const d = json.ip;
  return {
    appears: d.appears === 1,
    frequency: d.frequency,
    confidence: d.confidence ?? null,
    lastseen: d.lastseen ?? null,
    torexit: d.torexit === 1,
    asn: d.asn ?? null,
    country: d.country ?? null,
  };
}

// ── Schemas ────────────────────────────────────────────────────────────────

const ParamsSchema = z.object({
  ip: z.string().openapi({
    param: { name: "ip", in: "path" },
    example: "185.220.101.1",
    title: "IP address",
  }),
});

const ResponseSchema = z
  .object({
    appears: z.boolean().openapi({ example: true, description: "IP found in the spam database" }),
    frequency: z.number().openapi({ example: 81, description: "Number of times reported" }),
    confidence: z.number().nullable().openapi({ example: 94.74, description: "Confidence score (0–100), null if not reported" }),
    lastseen: z.string().nullable().openapi({ example: "2026-04-16 14:20:31", description: "Last report timestamp" }),
    torexit: z.boolean().openapi({ example: true, description: "Known Tor exit node" }),
    asn: z.number().nullable().openapi({ example: 60729 }),
    country: z.string().nullable().openapi({ example: "de" }),
  })
  .openapi("StopForumSpam");

// ── Route ──────────────────────────────────────────────────────────────────

export const route = createRoute({
  tags: ["IP"],
  method: "get",
  path: "/reputation/{ip}",
  request: { params: ParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: ResponseSchema } },
      description: "IP spam reputation — abuse reports, confidence score, Tor exit status",
    },
  },
  description: "IP reputation via StopForumSpam — spam report count, confidence score, Tor exit node detection",
  externalDocs: { description: "StopForumSpam", url: "https://www.stopforumspam.com" },
});
