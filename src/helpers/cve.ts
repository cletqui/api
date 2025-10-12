import { z, createRoute } from "@hono/zod-openapi";

// ── Types ──────────────────────────────────────────────────────────────────

interface CveResponse {
  dataType: string;
  dataVersion: string;
  cveMetadata: {
    state: string;
    cveId: string;
    assignedOrgId: string;
    assignerShortName: string;
    dateUpdated: string;
    dateReserved: string;
    datePublished: string;
  };
  containers: {
    cna: {
      title: string;
      descriptions?: { lang: string; value: string }[];
      affected?: unknown[];
      metrics?: unknown[];
      references?: { url: string; name?: string }[];
    };
  };
}

// ── Query ──────────────────────────────────────────────────────────────────

export async function query(id: string): Promise<CveResponse> {
  const url = `https://cveawg.mitre.org/api/cve/${encodeURIComponent(id)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    const err = Object.assign(
      new Error(`CVE lookup failed: ${response.status} ${response.statusText}`),
      { status: response.status }
    );
    throw err;
  }
  return response.json() as Promise<CveResponse>;
}

// ── Schemas ────────────────────────────────────────────────────────────────

const ParamsSchema = z.object({
  id: z
    .string()
    .regex(/^CVE-\d{4}-\d{4,}$/, "CVE ID must be in the format CVE-YYYY-NNNNN")
    .openapi({
      param: { name: "id", in: "path" },
      example: "CVE-2021-44228",
      title: "CVE ID",
    }),
});

const CveMetadataSchema = z.object({
  state: z.string().openapi({ example: "PUBLISHED" }),
  cveId: z.string().openapi({ example: "CVE-2021-44228" }),
  assignedOrgId: z.string().openapi({ example: "apache" }),
  assignerShortName: z.string().openapi({ example: "apache" }),
  dateUpdated: z.string().openapi({ example: "2023-04-03T17:09:17.000Z" }),
  dateReserved: z.string().openapi({ example: "2021-12-01T00:00:00.000Z" }),
  datePublished: z.string().openapi({ example: "2021-12-10T00:00:00.000Z" }),
});

const ResponseSchema = z
  .object({
    dataType: z.string().openapi({ example: "CVE_RECORD" }),
    dataVersion: z.string().openapi({ example: "5.0" }),
    cveMetadata: CveMetadataSchema,
    containers: z.object({
      cna: z.object({
        title: z.string().openapi({ example: "Apache Log4j2 JNDI features do not protect against attacker controlled LDAP and other JNDI related endpoints" }),
        descriptions: z
          .array(z.object({ lang: z.string(), value: z.string() }))
          .optional(),
        affected: z.array(z.unknown()).optional(),
        metrics: z.array(z.unknown()).optional(),
        references: z
          .array(z.object({ url: z.string(), name: z.string().optional() }))
          .optional(),
      }),
    }),
  })
  .openapi("CveRecord");

// ── Route ──────────────────────────────────────────────────────────────────

export const route = createRoute({
  tags: ["CVE"],
  method: "get",
  path: "/{id}",
  request: { params: ParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: ResponseSchema } },
      description: "CVE record from MITRE",
    },
    400: { description: "Invalid CVE ID format" },
    404: { description: "CVE not found" },
  },
  description: "Common Vulnerabilities and Exposures — full CVE record",
  externalDocs: { description: "cve.org", url: "https://www.cve.org" },
});
