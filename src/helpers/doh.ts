import { z, createRoute } from "@hono/zod-openapi";

const resolvers = {
  cloudflare: "cloudflare-dns.com/dns-query",
  google: "dns.google/resolve",
  quad9: "dns.quad9.net:5053/dns-query",
};

/* QUERY */
interface NSLookupResponse {
  A: DoHResponse;
  AAAA: DoHResponse;
  CNAME: DoHResponse;
  TXT: DoHResponse;
  NS: DoHResponse;
  MX: DoHResponse;
}

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

export async function query(
  resolver: keyof typeof resolvers,
  name: string,
  type: string = "A",
  DO: boolean = false,
  CD: boolean = false
): Promise<DoHResponse> {
  const endpoint = resolvers[resolver];
  const url = `https://${endpoint}?name=${name}${type ? `&type=${type}` : ""}${
    DO ? `do=${DO}` : ""
  }${CD ? `$cd=${CD}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/dns-json",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch data: ${response.status} ${response.statusText}`
    );
  } // TODO handle returned errors
  return (await response.json()) as DoHResponse;
}

/*SCHEMAS */
const ParamsSchema = z.object({
  resolver: z.enum(Object.keys(resolvers)).openapi({
    param: {
      name: "resolver",
      in: "path",
    },
    example: "cloudflare",
    title: "Resolver",
  }),
  domain: z.string({ required_error: "Domain name is required." }).openapi({
    param: {
      name: "domain",
      in: "path",
    },
    example: "example.com",
    title: "Domain name",
  }),
});

const DoHQuerySchema = z.object({
  type: z
    .string()
    .optional()
    .default("A")
    .openapi({
      param: {
        name: "type",
        in: "query",
      },
      example: "A",
      title: "Query type",
    }),
  DO: z
    .boolean()
    .optional()
    .default(false)
    .openapi({
      param: { name: "DO", in: "query" },
      example: false,
      title: "DO bit (DNSSEC data)",
    }),
  CD: z
    .boolean()
    .optional()
    .default(false)
    .openapi({
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
        data: z
          .string()
          .openapi({ example: "2606:2800:220:1:248:1893:25c8:1946" }),
      })
    ),
  })
  .openapi("DoH Record");

const NSLookupResponseSchema = z
  .object({
    A: DoHResponseSchema,
    AAAA: DoHResponseSchema,
    CNAME: DoHResponseSchema,
    TXT: DoHResponseSchema,
    NS: DoHResponseSchema,
    MX: DoHResponseSchema,
  })
  .openapi("Nslookup");

/* ROUTE */
export const DNSQueryRoute = createRoute({
  tags: ["Domain"],
  method: "get",
  path: "/dns-query/{resolver}/{domain}",
  request: { params: ParamsSchema, query: DoHQuerySchema },
  responses: {
    // TODO customize error responses (https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
    200: {
      content: {
        "application/json": {
          schema: DoHResponseSchema,
        },
      },
      description: "Fetch DoH Records",
    },
  },
  description: "DNS over HTTPs",
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
    // TODO customize error responses (https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
    200: {
      content: {
        "application/json": {
          schema: NSLookupResponseSchema,
        },
      },
      description: "Fetch DoH Lookup",
    },
  },
  description: "DNS over HTTPs",
  externalDocs: {
    description: "RFC 8484",
    url: "https://www.rfc-editor.org/rfc/rfc8484",
  },
});
