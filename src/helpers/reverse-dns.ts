import { z, createRoute } from "@hono/zod-openapi";
import { query as dohQuery } from "./doh";

// ── Helpers ────────────────────────────────────────────────────────────────

function expandIPv6(ip: string): string {
  const halves = ip.split("::");
  if (halves.length === 2) {
    const left = halves[0] ? halves[0].split(":") : [];
    const right = halves[1] ? halves[1].split(":") : [];
    const fill = Array(8 - left.length - right.length).fill("0000");
    return [...left, ...fill, ...right].map((g) => g.padStart(4, "0")).join("");
  }
  return ip.split(":").map((g) => g.padStart(4, "0")).join("");
}

function toArpa(ip: string): string {
  if (!ip.includes(":")) {
    const p = ip.split(".");
    return `${p[3]}.${p[2]}.${p[1]}.${p[0]}.in-addr.arpa`;
  }
  return expandIPv6(ip).split("").reverse().join(".") + ".ip6.arpa";
}

// ── Query ──────────────────────────────────────────────────────────────────

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
  ip: z.string().openapi({ param: { name: "ip", in: "path" }, example: "1.1.1.1" }),
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
      description: "PTR records for the IP (IPv4 and IPv6)",
    },
  },
  description: "Reverse DNS (PTR) lookup via Cloudflare DoH — supports IPv4 and IPv6",
  externalDocs: { description: "Cloudflare DoH", url: "https://cloudflare-dns.com" },
});
