import { z, createRoute } from "@hono/zod-openapi";

// ── Types ──────────────────────────────────────────────────────────────────

interface RdapResponse {
  ldhName: string;
  handle?: string;
  status: string[];
  events: { eventAction: string; eventDate: string }[];
  entities?: { roles: string[]; vcardArray?: unknown[]; handle?: string }[];
  nameservers?: { ldhName: string }[];
  secureDNS?: { delegationSigned: boolean };
  links?: { rel: string; href: string }[];
}

// ── Query ──────────────────────────────────────────────────────────────────

export async function query(domain: string): Promise<RdapResponse> {
  const url = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    const err = Object.assign(
      new Error(`WHOIS lookup failed: ${response.status} ${response.statusText}`),
      { status: response.status }
    );
    throw err;
  }
  return response.json() as Promise<RdapResponse>;
}

// ── Schemas ────────────────────────────────────────────────────────────────

const ParamsSchema = z.object({
  domain: z.string().openapi({
    param: { name: "domain", in: "path" },
    example: "example.com",
    title: "Domain name",
  }),
});

const ResponseSchema = z
  .object({
    ldhName: z.string().openapi({ example: "EXAMPLE.COM" }),
    handle: z.string().optional().openapi({ example: "2336799_DOMAIN_COM-VRSN" }),
    status: z
      .array(z.string())
      .openapi({ example: ["client delete prohibited", "client transfer prohibited"] }),
    events: z.array(
      z.object({
        eventAction: z.string().openapi({ example: "registration" }),
        eventDate: z.string().openapi({ example: "1995-08-14T04:00:00Z" }),
      })
    ),
    entities: z
      .array(
        z.object({
          roles: z.array(z.string()).openapi({ example: ["registrar"] }),
          handle: z.string().optional().openapi({ example: "292" }),
          vcardArray: z.array(z.unknown()).optional(),
        })
      )
      .optional(),
    nameservers: z
      .array(z.object({ ldhName: z.string().openapi({ example: "A.IANA-SERVERS.NET" }) }))
      .optional(),
    secureDNS: z.object({ delegationSigned: z.boolean() }).optional(),
    links: z.array(z.object({ rel: z.string(), href: z.string() })).optional(),
  })
  .openapi("Whois");

// ── Route ──────────────────────────────────────────────────────────────────

export const route = createRoute({
  tags: ["Domain"],
  method: "get",
  path: "/whois/{domain}",
  request: { params: ParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: ResponseSchema } },
      description: "RDAP/WHOIS registration data",
    },
    404: { description: "Domain not found" },
  },
  description: "RDAP (WHOIS) registration data via rdap.org",
  externalDocs: { description: "rdap.org", url: "https://rdap.org" },
});
