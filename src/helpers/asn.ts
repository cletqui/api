import { z, createRoute } from "@hono/zod-openapi";

// ── Types ──────────────────────────────────────────────────────────────────

interface AsnResponse {
  status: string;
  status_message: string;
  data: {
    asn: number;
    name: string;
    description_short: string;
    description_full: string[];
    country_code: string;
    website: string | null;
    email_contacts: string[];
    abuse_contacts: string[];
    looking_glass: string | null;
    traffic_estimation: string | null;
    traffic_ratio: string | null;
    owner_address: string[];
    rir_allocation: {
      rir_name: string;
      country_code: string | null;
      date_allocated: string | null;
      allocation_status: string;
    };
    iana_assignment: {
      assignment_status: string;
      description: string | null;
      whois_server: string | null;
      date_assigned: string | null;
    };
    date_updated: string;
  };
}

interface AsnPrefixesResponse {
  status: string;
  status_message: string;
  data: {
    ipv4_prefixes: {
      prefix: string;
      ip: string;
      cidr: number;
      name: string;
      description: string;
      country_code: string;
      parent?: { prefix: string; ip: string; cidr: number; rir_name: string; allocation_status: string };
    }[];
    ipv6_prefixes: {
      prefix: string;
      ip: string;
      cidr: number;
      name: string;
      description: string;
      country_code: string;
    }[];
  };
}

// ── Queries ────────────────────────────────────────────────────────────────

export async function queryAsn(asn: string): Promise<AsnResponse> {
  const normalized = asn.toUpperCase().replace(/^AS/, "");
  const response = await fetch(`https://api.bgpview.io/asn/${encodeURIComponent(normalized)}`, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    const err = Object.assign(
      new Error(`ASN lookup failed: ${response.status} ${response.statusText}`),
      { status: response.status }
    );
    throw err;
  }
  return response.json() as Promise<AsnResponse>;
}

export async function queryAsnPrefixes(asn: string): Promise<AsnPrefixesResponse> {
  const normalized = asn.toUpperCase().replace(/^AS/, "");
  const response = await fetch(`https://api.bgpview.io/asn/${encodeURIComponent(normalized)}/prefixes`, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    const err = Object.assign(
      new Error(`ASN prefix lookup failed: ${response.status} ${response.statusText}`),
      { status: response.status }
    );
    throw err;
  }
  return response.json() as Promise<AsnPrefixesResponse>;
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
      description: "Autonomous System Number, with or without the AS prefix",
    }),
});

const RirAllocationSchema = z.object({
  rir_name: z.string().openapi({ example: "ARIN" }),
  country_code: z.string().nullable().openapi({ example: "US" }),
  date_allocated: z.string().nullable().openapi({ example: "2010-07-14 00:00:00" }),
  allocation_status: z.string().openapi({ example: "allocated" }),
});

const AsnResponseSchema = z
  .object({
    asn: z.number().openapi({ example: 13335 }),
    name: z.string().openapi({ example: "CLOUDFLARENET" }),
    description_short: z.string().openapi({ example: "Cloudflare, Inc." }),
    description_full: z.array(z.string()),
    country_code: z.string().openapi({ example: "US" }),
    website: z.string().nullable().openapi({ example: "https://www.cloudflare.com" }),
    email_contacts: z.array(z.string()).openapi({ example: ["arin@cloudflare.com"] }),
    abuse_contacts: z.array(z.string()).openapi({ example: ["abuse@cloudflare.com"] }),
    rir_allocation: RirAllocationSchema,
    date_updated: z.string().openapi({ example: "2024-05-02 10:43:51" }),
  })
  .openapi("AsnInfo");

const Ipv4PrefixSchema = z.object({
  prefix: z.string().openapi({ example: "1.1.1.0/24" }),
  ip: z.string().openapi({ example: "1.1.1.0" }),
  cidr: z.number().openapi({ example: 24 }),
  name: z.string().openapi({ example: "APNIC-LABS" }),
  description: z.string().openapi({ example: "APNIC and Cloudflare DNS Resolver project" }),
  country_code: z.string().openapi({ example: "AU" }),
});

const AsnPrefixesResponseSchema = z
  .object({
    ipv4_prefixes: z.array(Ipv4PrefixSchema),
    ipv6_prefixes: z.array(
      Ipv4PrefixSchema.omit({ cidr: true }).extend({ cidr: z.number().openapi({ example: 48 }) })
    ),
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
      content: { "application/json": { schema: AsnResponseSchema } },
      description: "ASN details, abuse contacts, RIR allocation",
    },
    404: { description: "ASN not found" },
  },
  description: "ASN details via BGPView — name, country, contacts, RIR allocation",
  externalDocs: { description: "BGPView", url: "https://bgpview.io" },
});

export const asnPrefixesRoute = createRoute({
  tags: ["ASN"],
  method: "get",
  path: "/{asn}/prefixes",
  request: { params: ParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: AsnPrefixesResponseSchema } },
      description: "IPv4 and IPv6 prefixes announced by the ASN",
    },
    404: { description: "ASN not found" },
  },
  description: "IPv4/IPv6 prefix list for an ASN via BGPView",
  externalDocs: { description: "BGPView", url: "https://bgpview.io" },
});
