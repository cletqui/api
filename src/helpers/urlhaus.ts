import { z, createRoute } from "@hono/zod-openapi";

// ── Types ──────────────────────────────────────────────────────────────────

// URLhaus uses "ok" when the host/URL was found, "no_results" when clean.
type UrlhausQueryStatus = "ok" | "no_results";

interface UrlEntry {
  id: string;
  url: string;
  url_status: string;
  date_added: string;
  threat: string;
  reporter: string;
  tags: string[] | null;
}

interface UrlhausHostResponse {
  query_status: UrlhausQueryStatus;
  urlhaus_reference?: string;
  host?: string;
  urls_count?: number;
  blacklists?: {
    spamhaus_dbl: string;
    surbl: string;
  };
  urls?: UrlEntry[];
  firstseen?: string;
}

interface UrlhausUrlResponse {
  query_status: UrlhausQueryStatus;
  urlhaus_reference?: string;
  url?: string;
  url_status?: string;
  date_added?: string;
  threat?: string;
  reporter?: string;
  blacklists?: {
    gsb: string;
    surbl: string;
    spamhaus_dbl: string;
  };
  tags?: string[] | null;
  payloads?: {
    firstseen: string;
    filename: string | null;
    file_type: string;
    response_size: string | null;
    response_md5: string;
    response_sha256: string;
    urlhaus_download: string;
    signature: string | null;
    virustotal?: {
      result: string;
      percent: string;
      link: string;
    } | null;
  }[];
}

// ── Queries ────────────────────────────────────────────────────────────────

export async function queryHost(host: string): Promise<UrlhausHostResponse> {
  const body = new URLSearchParams({ host });
  const response = await fetch("https://urlhaus-api.abuse.ch/v1/host/", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok) {
    const err = Object.assign(
      new Error(`URLhaus host lookup failed: ${response.status} ${response.statusText}`),
      { status: response.status }
    );
    throw err;
  }
  return response.json() as Promise<UrlhausHostResponse>;
}

export async function queryUrl(url: string): Promise<UrlhausUrlResponse> {
  const body = new URLSearchParams({ url });
  const response = await fetch("https://urlhaus-api.abuse.ch/v1/url/", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok) {
    const err = Object.assign(
      new Error(`URLhaus URL lookup failed: ${response.status} ${response.statusText}`),
      { status: response.status }
    );
    throw err;
  }
  return response.json() as Promise<UrlhausUrlResponse>;
}

// ── Schemas ────────────────────────────────────────────────────────────────

const DomainParamsSchema = z.object({
  domain: z.string().openapi({
    param: { name: "domain", in: "path" },
    example: "example.com",
    title: "Domain or host",
  }),
});

const IpParamsSchema = z.object({
  ip: z.string().openapi({
    param: { name: "ip", in: "path" },
    example: "1.2.3.4",
    title: "IP address",
  }),
});

const UrlQuerySchema = z.object({
  url: z
    .string()
    .openapi({
      param: { name: "url", in: "query" },
      example: "http://malicious.example.com/payload.exe",
      description: "Full URL to check (must include scheme)",
    }),
});

const UrlEntrySchema = z.object({
  id: z.string().openapi({ example: "1234567" }),
  url: z.string().openapi({ example: "http://example.com/bad.exe" }),
  url_status: z.string().openapi({ example: "online" }),
  date_added: z.string().openapi({ example: "2024-01-15 12:00:00 UTC" }),
  threat: z.string().openapi({ example: "malware_download" }),
  reporter: z.string().openapi({ example: "abuse_ch" }),
  tags: z.array(z.string()).nullable().openapi({ example: ["Emotet", "doc"] }),
});

const HostResponseSchema = z
  .object({
    query_status: z.string().openapi({ example: "ok", description: '"ok" = found, "no_results" = clean' }),
    urlhaus_reference: z.string().optional().openapi({ example: "https://urlhaus.abuse.ch/host/1.2.3.4/" }),
    host: z.string().optional().openapi({ example: "1.2.3.4" }),
    urls_count: z.number().optional().openapi({ example: 3 }),
    blacklists: z
      .object({
        spamhaus_dbl: z.string().openapi({ example: "not listed" }),
        surbl: z.string().openapi({ example: "not listed" }),
      })
      .optional(),
    urls: z.array(UrlEntrySchema).optional(),
    firstseen: z.string().optional().openapi({ example: "2024-01-15 12:00:00 UTC" }),
  })
  .openapi("UrlhausHostResult");

const UrlResponseSchema = z
  .object({
    query_status: z.string().openapi({ example: "ok" }),
    urlhaus_reference: z.string().optional().openapi({ example: "https://urlhaus.abuse.ch/url/1234567/" }),
    url: z.string().optional(),
    url_status: z.string().optional().openapi({ example: "online" }),
    date_added: z.string().optional(),
    threat: z.string().optional().openapi({ example: "malware_download" }),
    blacklists: z
      .object({
        gsb: z.string().openapi({ example: "not listed" }),
        surbl: z.string().openapi({ example: "not listed" }),
        spamhaus_dbl: z.string().openapi({ example: "not listed" }),
      })
      .optional(),
    tags: z.array(z.string()).nullable().optional(),
  })
  .openapi("UrlhausUrlResult");

// ── Routes ─────────────────────────────────────────────────────────────────

export const domainThreatRoute = createRoute({
  tags: ["Domain"],
  method: "get",
  path: "/threat/{domain}",
  request: { params: DomainParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: HostResponseSchema } },
      description: "URLhaus malware distribution history for the domain",
    },
  },
  description: "Check if a domain has been used to distribute malware — URLhaus (abuse.ch)",
  externalDocs: { description: "URLhaus API", url: "https://urlhaus.abuse.ch/api/" },
});

export const ipThreatRoute = createRoute({
  tags: ["IP"],
  method: "get",
  path: "/threat/{ip}",
  request: { params: IpParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: HostResponseSchema } },
      description: "URLhaus malware distribution history for the IP",
    },
  },
  description: "Check if an IP has been used to distribute malware — URLhaus (abuse.ch)",
  externalDocs: { description: "URLhaus API", url: "https://urlhaus.abuse.ch/api/" },
});

export const urlThreatRoute = createRoute({
  tags: ["Domain"],
  method: "get",
  path: "/url/threat",
  request: { query: UrlQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: UrlResponseSchema } },
      description: "URLhaus lookup result for a specific URL",
    },
  },
  description: "Check if a specific URL is a known malware distribution point — URLhaus (abuse.ch)",
  externalDocs: { description: "URLhaus API", url: "https://urlhaus.abuse.ch/api/" },
});
