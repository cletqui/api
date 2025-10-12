import { z, createRoute } from "@hono/zod-openapi";

// ── Types ──────────────────────────────────────────────────────────────────

interface CertRecord {
  issuer_ca_id: number;
  issuer_name: string;
  common_name: string;
  name_value: string;
  id: number;
  entry_timestamp: string | null;
  not_before: string;
  not_after: string;
  serial_number: string;
  result_count: number;
}

// ── Query ──────────────────────────────────────────────────────────────────

export async function query(
  domain: string,
  exclude?: string,
  deduplicate?: string
): Promise<CertRecord[]> {
  const url = new URL(`https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`);
  if (exclude) url.searchParams.append("exclude", exclude);
  if (deduplicate) url.searchParams.append("deduplicate", deduplicate);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    const err = Object.assign(
      new Error(`crt.sh lookup failed: ${response.status} ${response.statusText}`),
      { status: response.status }
    );
    throw err;
  }
  return response.json() as Promise<CertRecord[]>;
}

// ── Schemas ────────────────────────────────────────────────────────────────

const ParamsSchema = z.object({
  domain: z.string().openapi({
    param: { name: "domain", in: "path" },
    example: "example.com",
    title: "Domain name",
  }),
});

const QuerySchema = z.object({
  exclude: z.string().optional().openapi({
    param: { name: "exclude", in: "query" },
    example: "expired",
    title: "Exclude expired certificates",
  }),
  deduplicate: z.string().optional().openapi({
    param: { name: "deduplicate", in: "query" },
    example: "Y",
    title: "Deduplicate certificate pairs",
  }),
});

const CertsResponseSchema = z
  .array(
    z.object({
      issuer_ca_id: z.number().openapi({ example: 185752 }),
      issuer_name: z.string().openapi({
        example: "C=US, O=DigiCert Inc, CN=DigiCert Global G2 TLS RSA SHA256 2020 CA1",
      }),
      common_name: z.string().openapi({ example: "www.example.org" }),
      name_value: z.string().openapi({ example: "example.com\nwww.example.com" }),
      id: z.number().openapi({ example: 12337892544 }),
      entry_timestamp: z.string().nullable().openapi({ example: "2024-03-10T20:13:50.549" }),
      not_before: z.string().openapi({ example: "2024-01-30T00:00:00" }),
      not_after: z.string().openapi({ example: "2025-03-01T23:59:59" }),
      serial_number: z.string().openapi({ example: "075bcef30689c8addf13e51af4afe187" }),
      result_count: z.number().openapi({ example: 2 }),
    })
  )
  .openapi("Certificates");

const SubdomainsResponseSchema = z
  .array(z.string().openapi({ example: "www.example.com" }))
  .openapi("Subdomains");

// ── Routes ─────────────────────────────────────────────────────────────────

export const route = createRoute({
  tags: ["Domain"],
  method: "get",
  path: "/certs/{domain}",
  request: { params: ParamsSchema, query: QuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: CertsResponseSchema } },
      description: "Certificate transparency records",
    },
  },
  description: "Certificate Transparency via crt.sh",
  externalDocs: { description: "crt.sh", url: "https://crt.sh/" },
});

export const subdomainsRoute = createRoute({
  tags: ["Domain"],
  method: "get",
  path: "/subdomains/{domain}",
  request: { params: ParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: SubdomainsResponseSchema } },
      description: "Unique non-wildcard subdomains from certificate transparency",
    },
  },
  description: "Subdomain enumeration via certificate transparency",
  externalDocs: { description: "crt.sh", url: "https://crt.sh/" },
});
