import { z, createRoute } from "@hono/zod-openapi";

/* QUERY */
// DOMAIN
interface DomainResponse {
  domain: string;
  "last-seen": number;
  tags: string[];
  abused: boolean;
  whois: { created: number; expires: number; registrar: string };
  score: number;
  dimension: {
    human: number;
    identity: number;
    infra: number;
    malware: number;
    smtp: number;
  };
}

export async function domainQuery(domain: string): Promise<DomainResponse> {
  const url = `https://www.spamhaus.org/api/v1/sia-proxy/api/intel/v2/byobject/domain/${domain}/overview`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch data: ${response.status} ${response.statusText}`
    );
  } // TODO handle returned errors
  return (await response.json()) as DomainResponse;
}

// IP
interface IPResponse {
  results: {
    dataset: string;
    ipaddress: string;
    asn: string;
    cc: string;
    listed: number;
  }[];
}

export async function IPQuery(ip: string): Promise<Response> {
  const url = `https://www.spamhaus.org/api/v1/sia-proxy/api/intel/v1/byobject/cidr/ALL/listings/live/${ip}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch data: ${response.status} ${response.statusText}`
    );
  } // TODO handle returned errors
  return (await response.json()) as Response;
}

/* SCHEMAS */
// DOMAIN
const DomainParamsSchema = z.object({
  domain: z.string({ required_error: "Domain is required." }).openapi({
    param: {
      name: "domain",
      in: "path",
    },
    example: "example.com",
    title: "IP",
  }),
});

const DomainResponseSchema = z.object({
  domain: z.string().openapi({ example: "example.com" }),
  "last-seen": z.number().openapi({ example: 1716453063 }),
  tags: z.array(z.string()).openapi({ example: ["phish", "spam"] }),
  abused: z.boolean().openapi({ example: false }),
  whois: z.object({
    created: z.number().openapi({ example: 808372800 }),
    expires: z.number().openapi({ example: 1723521600 }),
    registrar: z
      .string()
      .openapi({ example: "RESERVED-Internet Assigned Numbers Authority" }),
  }),
  score: z.number().openapi({ example: 32.5 }),
  dimensions: z.object({
    human: z.number().openapi({ example: 25 }),
    identity: z.number().openapi({ example: 0 }),
    infra: z.number().openapi({ example: 13 }),
    malware: z.number().openapi({ example: 0 }),
    smtp: z.number().openapi({ example: -5.5 }),
  }),
});

// IP
const IPParamsSchema = z.object({
  ip: z.string({ required_error: "IP is required." }).openapi({
    param: {
      name: "ip",
      in: "path",
    },
    example: "1.1.1.1",
    title: "IP",
  }),
});

const IPResponseSchema = z.object({
  results: z.array(
    z.object({
      dataset: z.string().openapi({ example: "XBL" }),
      ipaddress: z.string().openapi({ example: "1.1.1.1" }),
      asn: z.string().openapi({ example: "13335" }),
      cc: z.string().openapi({ example: "AU" }),
      listed: z.number().openapi({ example: 1716440127 }),
    })
  ),
});

/* ROUTE */
// DOMAIN
export const domainRoute = createRoute({
  tags: ["Domain"],
  method: "get",
  path: "/reputation/{domain}",
  request: { params: DomainParamsSchema },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: DomainResponseSchema,
        },
      },
      description: "Fetch domain reputation",
    },
  },
  externalDocs: {
    description: "spamhaus.org",
    url: "https://www.spamhaus.org/domain-reputation/",
  },
});

// IP
export const IPRoute = createRoute({
  tags: ["IP"],
  method: "get",
  path: "/reputation/{ip}",
  request: { params: IPParamsSchema },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: DomainResponseSchema,
        },
      },
      description: "Fetch IP reputation",
    },
  },
  externalDocs: {
    description: "spamhaus.org",
    url: "https://www.spamhaus.org/ip-reputation/",
  },
});
