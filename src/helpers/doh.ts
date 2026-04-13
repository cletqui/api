import { z, createRoute } from "@hono/zod-openapi";

const resolvers = {
  cloudflare: "cloudflare-dns.com/dns-query",
  google: "dns.google/resolve",
  quad9: "dns.quad9.net:5053/dns-query",
} as const;

// ── Types ──────────────────────────────────────────────────────────────────

interface DoHResponse {
  Status: number;
  TC: boolean;
  RD: boolean;
  RA: boolean;
  AD: boolean;
  CD: boolean;
  Question: { name: string; type: number }[];
  Answer: { name: string; type: number; TTL: number; data: string }[];
}

// ── Query ──────────────────────────────────────────────────────────────────

export async function query(
  resolver: keyof typeof resolvers,
  name: string,
  type: string = "A",
  DO: boolean = false,
  CD: boolean = false
): Promise<DoHResponse> {
  const endpoint = resolvers[resolver];
  const params = new URLSearchParams({ name, type });
  if (DO) params.set("do", "true");
  if (CD) params.set("cd", "true");

  const url = `https://${endpoint}?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/dns-json" },
  });
  if (!response.ok) {
    const err = Object.assign(
      new Error(`DoH query failed: ${response.status} ${response.statusText}`),
      { status: response.status }
    );
    throw err;
  }
  return response.json() as Promise<DoHResponse>;
}

// ── Schemas ────────────────────────────────────────────────────────────────

const ParamsSchema = z.object({
  resolver: z.enum(Object.keys(resolvers) as [string, ...string[]]).openapi({
    param: { name: "resolver", in: "path" },
    example: "cloudflare",
    title: "Resolver",
  }),
  domain: z.string().openapi({
    param: { name: "domain", in: "path" },
    example: "example.com",
    title: "Domain name",
  }),
});

const DoHQuerySchema = z.object({
  type: z.string().optional().default("A").openapi({
    param: { name: "type", in: "query" },
    example: "A",
    title: "Query type",
  }),
  DO: z.boolean().optional().default(false).openapi({
    param: { name: "DO", in: "query" },
    example: false,
    title: "DO bit (DNSSEC data)",
  }),
  CD: z.boolean().optional().default(false).openapi({
    param: { name: "CD", in: "query" },
    example: false,
    title: "CD bit (disable validation)",
  }),
});

const DoHResponseSchema = z
  .object({
    Status: z.number().openapi({ example: 0 }),
    TC: z.boolean().openapi({ example: false }),
    RD: z.boolean().openapi({ example: true }),
    RA: z.boolean().openapi({ example: true }),
    AD: z.boolean().openapi({ example: true }),
    CD: z.boolean().openapi({ example: false }),
    Question: z.array(
      z.object({
        name: z.string().openapi({ example: "example.com." }),
        type: z.number().openapi({ example: 28 }),
      })
    ),
    Answer: z.array(
      z.object({
        name: z.string().openapi({ example: "example.com." }),
        type: z.number().openapi({ example: 28 }),
        TTL: z.number().openapi({ example: 1726 }),
        data: z.string().openapi({ example: "2606:2800:220:1:248:1893:25c8:1946" }),
      })
    ),
  })
  .openapi("DoHRecord");

const NSLookupResponseSchema = z
  .object({
    A: DoHResponseSchema,
    AAAA: DoHResponseSchema,
    CNAME: DoHResponseSchema,
    TXT: DoHResponseSchema,
    NS: DoHResponseSchema,
    MX: DoHResponseSchema,
  })
  .openapi("NsLookup");

// ── Routes ─────────────────────────────────────────────────────────────────

export const DNSQueryRoute = createRoute({
  tags: ["Domain"],
  method: "get",
  path: "/dns-query/{resolver}/{domain}",
  request: { params: ParamsSchema, query: DoHQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: DoHResponseSchema } },
      description: "DNS-over-HTTPS query result",
    },
  },
  description: "DNS over HTTPS (DoH) single record type query",
  externalDocs: {
    description: "RFC 8484",
    url: "https://www.rfc-editor.org/rfc/rfc8484",
  },
});

export const NSLookupRoute = createRoute({
  tags: ["Domain"],
  method: "get",
  path: "/nslookup/{resolver}/{domain}",
  request: { params: ParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: NSLookupResponseSchema } },
      description: "Full NS lookup (A, AAAA, CNAME, TXT, NS, MX)",
    },
  },
  description: "DNS over HTTPS (DoH) full nslookup",
  externalDocs: {
    description: "RFC 8484",
    url: "https://www.rfc-editor.org/rfc/rfc8484",
  },
});
