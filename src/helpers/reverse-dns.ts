import { z, createRoute } from "@hono/zod-openapi";

// ── Types ──────────────────────────────────────────────────────────────────

interface ReverseDnsResponse {
  query: {
    timestamp: string;
    overallProcessingTimeMs: number;
    IPv4: number;
    IPv4_CIDR: string[];
    IPv6_CIDR: string[];
    IPv4_reverse_found: string;
    IPv6_reverse_found: string;
    detectedBogons: number;
    detectedDuplicates: number;
  };
  cidrDetails: unknown[];
  individualIpDetails: {
    IPv4: Record<string, {
      originalIp: string;
      type: string;
      responsibleNsZone: string;
      primaryNameServer: string;
      arpaFormat: string;
      reverseDns: string;
      primaryNsProcessingTimeMs: number;
    }>;
    IPv6: Record<string, unknown>;
  };
  detectedBogons: unknown[];
  detectedDuplicates: unknown[];
}

// ── Query ──────────────────────────────────────────────────────────────────

export async function query(ip: string): Promise<ReverseDnsResponse> {
  const response = await fetch("https://reversedns.io/api/get-reverse-dns", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ ips: [ip] }),
  });
  if (!response.ok) {
    const err = Object.assign(
      new Error(`Reverse DNS lookup failed: ${response.status} ${response.statusText}`),
      { status: response.status }
    );
    throw err;
  }
  return response.json() as Promise<ReverseDnsResponse>;
}

// ── Schemas ────────────────────────────────────────────────────────────────

const ParamsSchema = z.object({
  ip: z.string().openapi({
    param: { name: "ip", in: "path" },
    example: "1.1.1.1",
    title: "IP address",
  }),
});

const ResponseSchema = z
  .object({
    query: z.object({
      timestamp: z.string().openapi({ example: "2024-05-22T15:47:12.135Z" }),
      overallProcessingTimeMs: z.number().openapi({ example: 114 }),
      IPv4: z.number().openapi({ example: 1 }),
      IPv6: z.number().openapi({ example: 0 }),
      IPv4_CIDR: z.array(z.string()),
      IPv6_CIDR: z.array(z.string()),
      IPv4_reverse_found: z.string().openapi({ example: "1 / 1" }),
      IPv6_reverse_found: z.string().openapi({ example: "0 / 0" }),
      detectedBogons: z.number().openapi({ example: 0 }),
      detectedDuplicates: z.number().openapi({ example: 0 }),
    }),
    cidrDetails: z.array(z.unknown()),
    individualIpDetails: z.object({
      IPv4: z.record(
        z.string(),
        z.object({
          originalIp: z.string().openapi({ example: "1.1.1.1" }),
          type: z.string().openapi({ example: "IPv4" }),
          responsibleNsZone: z.string().openapi({ example: "1.1.1.in-addr.arpa" }),
          primaryNameServer: z.string().openapi({ example: "alec.ns.cloudflare.com" }),
          arpaFormat: z.string().openapi({ example: "1.1.1.1.in-addr.arpa" }),
          reverseDns: z.string().openapi({ example: "one.one.one.one" }),
          primaryNsProcessingTimeMs: z.number().openapi({ example: 112 }),
        })
      ),
      IPv6: z.record(z.string(), z.unknown()),
    }),
    detectedBogons: z.array(z.unknown()),
    detectedDuplicates: z.array(z.unknown()),
  })
  .openapi("ReverseDns");

// ── Route ──────────────────────────────────────────────────────────────────

export const route = createRoute({
  tags: ["IP"],
  method: "get",
  path: "/reverse-dns/{ip}",
  request: { params: ParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: ResponseSchema } },
      description: "Reverse DNS lookup result",
    },
  },
  description: "Reverse DNS",
  externalDocs: {
    description: "reversedns.io",
    url: "https://reversedns.io/",
  },
});
