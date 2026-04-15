import { z, createRoute } from "@hono/zod-openapi";

// ── Types ──────────────────────────────────────────────────────────────────

export interface DomainWhois {
  name: string;
  registrar?: string;
  registered?: string;
  expires?: string;
  updated?: string;
  status: string[];
  nameservers: string[];
}

export interface IpWhois {
  resource: string;
  records: { key: string; value: string }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function extractEntity(entities: any[], role: string): string | undefined {
  const e = entities?.find((e: any) => e.roles?.includes(role));
  if (!e) return undefined;
  const vcard = e.vcardArray?.[1];
  const fn = vcard?.find((f: any) => f[0] === "fn")?.[3];
  return fn ?? e.handle;
}

function extractDate(events: any[], action: string): string | undefined {
  return events?.find((e: any) => e.eventAction === action)?.eventDate;
}

// ── Queries ────────────────────────────────────────────────────────────────

export async function domainQuery(domain: string): Promise<DomainWhois> {
  const res = await fetch(`https://rdap.iana.org/domain/${encodeURIComponent(domain)}`, {
    headers: { accept: "application/json" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw Object.assign(new Error(`WHOIS lookup failed: ${res.status}`), { status: res.status });
  }
  const d = await res.json() as any;
  return {
    name: d.ldhName ?? domain,
    registrar: extractEntity(d.entities, "registrar"),
    registered: extractDate(d.events, "registration"),
    expires: extractDate(d.events, "expiration"),
    updated: extractDate(d.events, "last changed"),
    status: d.status ?? [],
    nameservers: (d.nameservers ?? []).map((ns: any) => ns.ldhName?.toLowerCase()).filter(Boolean),
  };
}

export async function ipQuery(ip: string): Promise<IpWhois> {
  const res = await fetch(`https://stat.ripe.net/data/whois/data.json?resource=${encodeURIComponent(ip)}`);
  if (!res.ok) {
    throw Object.assign(new Error(`IP WHOIS lookup failed: ${res.status}`), { status: res.status });
  }
  const json = await res.json() as { status: string; data: { records: { key: string; value: string }[][] } };
  const records = json.data.records?.flat().filter((r) => r.value?.trim()) ?? [];
  return { resource: ip, records };
}

// ── Schemas ────────────────────────────────────────────────────────────────

const DomainParamsSchema = z.object({
  domain: z.string().openapi({ param: { name: "domain", in: "path" }, example: "example.com" }),
});

const IpParamsSchema = z.object({
  ip: z.string().openapi({ param: { name: "ip", in: "path" }, example: "1.1.1.1" }),
});

const DomainWhoisSchema = z
  .object({
    name: z.string().openapi({ example: "EXAMPLE.COM" }),
    registrar: z.string().optional().openapi({ example: "RESERVED-Internet Assigned Numbers Authority" }),
    registered: z.string().optional().openapi({ example: "1995-08-14T04:00:00Z" }),
    expires: z.string().optional().openapi({ example: "2025-08-13T04:00:00Z" }),
    updated: z.string().optional().openapi({ example: "2024-08-14T07:01:44Z" }),
    status: z.array(z.string()).openapi({ example: ["client delete prohibited"] }),
    nameservers: z.array(z.string()).openapi({ example: ["a.iana-servers.net"] }),
  })
  .openapi("DomainWhois");

const IpWhoisSchema = z
  .object({
    resource: z.string().openapi({ example: "1.1.1.1" }),
    records: z.array(z.object({
      key: z.string().openapi({ example: "netname" }),
      value: z.string().openapi({ example: "APNIC-LABS" }),
    })),
  })
  .openapi("IpWhois");

// ── Routes ──────────────────────────────────────────────────────────────────

export const domainRoute = createRoute({
  tags: ["Domain"],
  method: "get",
  path: "/whois/{domain}",
  request: { params: DomainParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: DomainWhoisSchema } },
      description: "RDAP/WHOIS registration data for the domain",
    },
  },
  description: "Domain WHOIS via IANA RDAP bootstrap",
  externalDocs: { description: "IANA RDAP", url: "https://rdap.iana.org" },
});

export const ipRoute = createRoute({
  tags: ["IP"],
  method: "get",
  path: "/whois/{ip}",
  request: { params: IpParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: IpWhoisSchema } },
      description: "WHOIS records for the IP",
    },
  },
  description: "IP WHOIS via RIPEstat",
  externalDocs: { description: "RIPEstat WHOIS", url: "https://stat.ripe.net" },
});
