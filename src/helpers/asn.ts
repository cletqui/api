import { z, createRoute } from "@hono/zod-openapi";

const BASE = "https://stat.ripe.net/data";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AsnInfo {
  asn: number;
  holder: string;
  announced: boolean;
  type: string;
}

export interface AsnPrefixes {
  ipv4_prefixes: { prefix: string }[];
  ipv6_prefixes: { prefix: string }[];
}

// ── Queries ────────────────────────────────────────────────────────────────

export async function queryAsn(asn: string): Promise<{ data: AsnInfo }> {
  const normalized = asn.toUpperCase().replace(/^AS/, "");
  const res = await fetch(`${BASE}/as-overview/data.json?resource=AS${normalized}`);
  if (!res.ok) throw Object.assign(new Error(`ASN lookup failed: ${res.status}`), { status: res.status });
  const json = await res.json() as { status: string; data: { resource: string; holder: string; announced: boolean; type: string } };
  if (json.status !== "ok") throw Object.assign(new Error("ASN not found"), { status: 404 });
  return {
    data: {
      asn: Number(normalized),
      holder: json.data.holder,
      announced: json.data.announced,
      type: json.data.type,
    },
  };
}

export async function queryAsnPrefixes(asn: string): Promise<{ data: AsnPrefixes }> {
  const normalized = asn.toUpperCase().replace(/^AS/, "");
  const res = await fetch(`${BASE}/announced-prefixes/data.json?resource=AS${normalized}`);
  if (!res.ok) throw Object.assign(new Error(`ASN prefix lookup failed: ${res.status}`), { status: res.status });
  const json = await res.json() as { status: string; data: { prefixes: { prefix: string }[] } };
  if (json.status !== "ok") throw Object.assign(new Error("ASN not found"), { status: 404 });
  const prefixes = json.data.prefixes ?? [];
  return {
    data: {
      ipv4_prefixes: prefixes.filter((p) => !p.prefix.includes(":")),
      ipv6_prefixes: prefixes.filter((p) => p.prefix.includes(":")),
    },
  };
}

// ── Schemas ────────────────────────────────────────────────────────────────

const ParamsSchema = z.object({
  asn: z
    .string()
    .regex(/^(?:AS)?\d+$/i, "Must be a valid ASN (e.g. 13335 or AS13335)")
    .openapi({
      param: { name: "asn", in: "path" },
      example: "AS13335",
      title: "ASN",
    }),
});

const AsnInfoSchema = z
  .object({
    asn: z.number().openapi({ example: 13335 }),
    holder: z.string().openapi({ example: "CLOUDFLARENET" }),
    announced: z.boolean().openapi({ example: true }),
    type: z.string().openapi({ example: "DIRECT_ALLOCATION" }),
  })
  .openapi("AsnInfo");

const AsnPrefixesSchema = z
  .object({
    ipv4_prefixes: z.array(z.object({ prefix: z.string().openapi({ example: "1.1.1.0/24" }) })),
    ipv6_prefixes: z.array(z.object({ prefix: z.string().openapi({ example: "2606:4700::/32" }) })),
  })
  .openapi("AsnPrefixes");

// ── Routes ─────────────────────────────────────────────────────────────────

export const asnRoute = createRoute({
  tags: ["ASN"],
  method: "get",
  path: "/{asn}",
  request: { params: ParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ data: AsnInfoSchema }) } },
      description: "ASN overview",
    },
    404: { description: "ASN not found" },
  },
  description: "ASN overview via RIPEstat — name, announced status",
  externalDocs: { description: "RIPEstat", url: "https://stat.ripe.net" },
});

export const asnPrefixesRoute = createRoute({
  tags: ["ASN"],
  method: "get",
  path: "/{asn}/prefixes",
  request: { params: ParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ data: AsnPrefixesSchema }) } },
      description: "Announced IPv4/IPv6 prefixes for the ASN",
    },
    404: { description: "ASN not found" },
  },
  description: "Announced prefix list for an ASN via RIPEstat",
  externalDocs: { description: "RIPEstat", url: "https://stat.ripe.net" },
});
