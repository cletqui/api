import { z, createRoute } from "@hono/zod-openapi";

/* QUERY */
interface ReverseDnsResponse {
  query: {
    timestamp: string;
    overallProcessingTimeMs: number;
    IPv4: number;
    IPv4_CIDR: [];
    IPv6_CIDR: [];
    IPv4_reverse_found: string;
    IPv6_reverse_found: string;
    detectedBogons: number;
    detectedDuplicates: number;
  };
  cidrDetails: [];
  individualIpDetails: { IPv4: {}; IPv6: {} };
  detectedBogons: [];
  detectedDuplicates: [];
}

export async function query(ip: string): Promise<ReverseDnsResponse> {
  const url = "https://reversedns.io/api/get-reverse-dns";
  console.log(url);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json",
    },
    body: JSON.stringify({ ips: [ip] }),
  });
  console.log(response.ok);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch data: ${response.status} ${response.statusText}`
    );
  } // TODO handle returned errors
  return (await response.json()) as ReverseDnsResponse;
}

/* SCHEMAS */
const ParamsSchema = z.object({
  ip: z.string({ required_error: "IP is required." }).openapi({
    param: {
      name: "ip",
      in: "path",
    },
    example: "1.1.1.1",
    title: "IP",
  }),
});

const ResponseSchema = z.object({
  query: z.object({
    timestamp: z.date().openapi({ example: "2024-05-22T15:47:12.135Z" }),
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
  cidrDetails: z.array(z.null()).openapi({ example: [] }),
  individualIpDetails: z.object({
    IPv4: z.object({}),
  }),
}); // TODO complete this schema with the example below

/*
{
  "query": {
    "timestamp": "2024-05-22T15:47:12.135Z",
    "overallProcessingTimeMs": 114,
    "IPv4": 1,
    "IPv6": 0,
    "IPv4_CIDR": [],
    "IPv6_CIDR": [],
    "IPv4_reverse_found": "1 / 1",
    "IPv6_reverse_found": "0 / 0",
    "detectedBogons": 0,
    "detectedDuplicates": 0
  },
  "cidrDetails": [],
  "individualIpDetails": {
    "IPv4": {
      "1.1.1.1": {
        "originalIp": "1.1.1.1",
        "type": "IPv4",
        "responsibleNsZone": "1.1.1.in-addr.arpa",
        "primaryNameServer": "alec.ns.cloudflare.com",
        "arpaFormat": "1.1.1.1.in-addr.arpa",
        "reverseDns": "one.one.one.one",
        "primaryNsProcessingTimeMs": 112
      }
    },
    "IPv6": {}
  },
  "detectedBogons": [],
  "detectedDuplicates": []
}
*/

export const route = createRoute({
  tags: ["IP"],
  method: "get",
  path: "/{ip}",
  request: { params: ParamsSchema },
  responses: {
    // TODO customize error responses (https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
    200: {
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
      description: "Fetch Reverse DNS Records",
    },
  },
  description: "Reverse DNS",
  externalDocs: {
    description: "reversedns.io",
    url: "https://reversedns.io/",
  },
});
