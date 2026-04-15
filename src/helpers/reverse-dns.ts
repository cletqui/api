import { z, createRoute } from "@hono/zod-openapi";
import { query as dohQuery } from "./doh";

// ── Query ──────────────────────────────────────────────────────────────────

function toArpa(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[3]}.${parts[2]}.${parts[1]}.${parts[0]}.in-addr.arpa`;
  }
  // IPv6: expand and reverse nibbles
  const full = ip.replace(/::/, (_, offset) => {
    const missing = 8 - (ip.replace(/::/g, ":").split(":").length - 1);
    return ":0000".repeat(missing).slice(1) + (offset + 2 < ip.length ? ":" : "");
  }).split(":").map(g => g.padStart(4, "0")).join("");
  return full.split("").reverse().join(".") + ".ip6.arpa";
}

export async function query(ip: string): Promise<{ ip: string; reverse_dns: string[] }> {
  try {
    const arpa = toArpa(ip);
    const response = await dohQuery("cloudflare", arpa, "PTR");
    const ptr = (response.Answer ?? []).map((r) => r.data.replace(/\.$/, ""));
    return { ip, reverse_dns: ptr };
  } catch {
    return { ip, reverse_dns: [] };
  }
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
    reverse_dns: z.array(z.string()).openapi({ example: ["one.one.one.one"] }),
  })
  .openapi("ReverseDns");

// ── Route ──────────────────────────────────────────────────────────────────

export const route = createRoute({
  tags: ["IP"],
  method: "get",
  path: "/reverse-dns/{ip}",
  request: { params: ParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: ResponseSchema } },
      description: "PTR records for the IP",
    },
  },
  description: "Reverse DNS (PTR) lookup via Cloudflare DoH",
  externalDocs: { description: "Cloudflare DoH", url: "https://cloudflare-dns.com" },
});
