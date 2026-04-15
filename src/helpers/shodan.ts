import { z, createRoute } from "@hono/zod-openapi";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ShodanInternetDB {
  ip: string;
  ports: number[];
  cpes: string[];
  hostnames: string[];
  tags: string[];
  vulns: string[];
}

// ── Query ──────────────────────────────────────────────────────────────────

export async function query(ip: string): Promise<ShodanInternetDB | null> {
  const response = await fetch(`https://internetdb.shodan.io/${encodeURIComponent(ip)}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw Object.assign(
      new Error(`Shodan InternetDB lookup failed: ${response.status} ${response.statusText}`),
      { status: response.status }
    );
  }
  return response.json() as Promise<ShodanInternetDB>;
}

// ── Schemas ────────────────────────────────────────────────────────────────

const ParamsSchema = z.object({
  ip: z.string().openapi({
    param: { name: "ip", in: "path" },
    example: "1.1.1.1",
    title: "IP address",
  }),
});

const ResponseSchema = z
  .object({
    ip: z.string().openapi({ example: "1.1.1.1" }),
    ports: z.array(z.number()).openapi({ example: [80, 443, 8080] }),
    cpes: z.array(z.string()).openapi({ example: ["cpe:/a:cloudflare:cloudflare"] }),
    hostnames: z.array(z.string()).openapi({ example: ["one.one.one.one"] }),
    tags: z.array(z.string()).openapi({ example: ["cloud", "cdn"] }),
    vulns: z.array(z.string()).openapi({ example: ["CVE-2021-44228"] }),
  })
  .nullable()
  .openapi("ShodanInternetDB");

// ── Route ──────────────────────────────────────────────────────────────────

export const route = createRoute({
  tags: ["IP"],
  method: "get",
  path: "/shodan/{ip}",
  request: { params: ParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: ResponseSchema } },
      description: "Open ports, hostnames, CPEs and known CVEs for the IP (null if no data)",
    },
  },
  description: "IP intelligence via Shodan InternetDB — open ports, banners, known CVEs",
  externalDocs: { description: "Shodan InternetDB", url: "https://internetdb.shodan.io" },
});
