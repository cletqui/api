import { z, createRoute } from "@hono/zod-openapi";

// ── Types ──────────────────────────────────────────────────────────────────

interface DomainResponse {
  domain: string;
  "last-seen": number;
  tags: string[];
  abused: boolean;
  whois: { created: number; expires: number; registrar: string };
  score: number;
  dimensions: {
    human: number;
    identity: number;
    infra: number;
    malware: number;
    smtp: number;
  };
}

interface IPResponse {
  results: {
    dataset: string;
    ipaddress: string;
    asn: string;
    cc: string;
    listed: number;
  }[];
}

// ── Queries ────────────────────────────────────────────────────────────────

export async function domainQuery(domain: string): Promise<DomainResponse> {
  const url = `https://www.spamhaus.org/api/v1/sia-proxy/api/intel/v2/byobject/domain/${encodeURIComponent(domain)}/overview`;
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    const err = Object.assign(
      new Error(`Domain reputation lookup failed: ${response.status} ${response.statusText}`),
      { status: response.status }
    );
    throw err;
  }
  return response.json() as Promise<DomainResponse>;
}

export async function IPQuery(ip: string): Promise<IPResponse> {
  const url = `https://www.spamhaus.org/api/v1/sia-proxy/api/intel/v1/byobject/cidr/ALL/listings/live/${encodeURIComponent(ip)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    const err = Object.assign(
      new Error(`IP reputation lookup failed: ${response.status} ${response.statusText}`),
      { status: response.status }
    );
    throw err;
  }
  return response.json() as Promise<IPResponse>;
}

// ── Schemas ────────────────────────────────────────────────────────────────

const DomainParamsSchema = z.object({
  domain: z.string().openapi({
    param: { name: "domain", in: "path" },
    example: "example.com",
    title: "Domain name",
  }),
});

const DomainResponseSchema = z
  .object({
    domain: z.string().openapi({ example: "example.com" }),
    "last-seen": z.number().openapi({ example: 1716453063 }),
    tags: z.array(z.string()).openapi({ example: ["phish", "spam"] }),
    abused: z.boolean().openapi({ example: false }),
    whois: z.object({
      created: z.number().openapi({ example: 808372800 }),
      expires: z.number().openapi({ example: 1723521600 }),
      registrar: z.string().openapi({ example: "RESERVED-Internet Assigned Numbers Authority" }),
    }),
    score: z.number().openapi({ example: 32.5 }),
    dimensions: z.object({
      human: z.number().openapi({ example: 25 }),
      identity: z.number().openapi({ example: 0 }),
      infra: z.number().openapi({ example: 13 }),
      malware: z.number().openapi({ example: 0 }),
      smtp: z.number().openapi({ example: -5.5 }),
    }),
  })
  .openapi("DomainReputation");

const IPParamsSchema = z.object({
  ip: z.string().openapi({
    param: { name: "ip", in: "path" },
    example: "1.1.1.1",
    title: "IP address",
  }),
});

const IPResponseSchema = z
  .object({
    results: z.array(
      z.object({
        dataset: z.string().openapi({ example: "XBL" }),
        ipaddress: z.string().openapi({ example: "1.1.1.1" }),
        asn: z.string().openapi({ example: "13335" }),
        cc: z.string().openapi({ example: "AU" }),
        listed: z.number().openapi({ example: 1716440127 }),
      })
    ),
  })
  .openapi("IpReputation");

// ── Routes ─────────────────────────────────────────────────────────────────

export const domainRoute = createRoute({
  tags: ["Domain"],
  method: "get",
  path: "/reputation/{domain}",
  request: { params: DomainParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: DomainResponseSchema } },
      description: "Domain reputation score and threat tags",
    },
  },
  description: "Domain reputation via Spamhaus Intelligence",
  externalDocs: {
    description: "spamhaus.org",
    url: "https://www.spamhaus.org/domain-reputation/",
  },
});

export const IPRoute = createRoute({
  tags: ["IP"],
  method: "get",
  path: "/reputation/{ip}",
  request: { params: IPParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: IPResponseSchema } },
      description: "IP blocklist listings",
    },
  },
  description: "IP reputation via Spamhaus blocklists",
  externalDocs: {
    description: "spamhaus.org",
    url: "https://www.spamhaus.org/ip-reputation/",
  },
});
