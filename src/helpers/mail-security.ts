import { z, createRoute } from "@hono/zod-openapi";
import { query as dohQuery } from "./doh";

// ── Types ──────────────────────────────────────────────────────────────────

export interface MailSecurityResult {
  domain: string;
  mx: MxRecord[];
  spf: SpfResult;
  dmarc: DmarcResult;
  dkim: DkimResult;
}

interface MxRecord {
  priority: number;
  exchange: string;
}

interface SpfResult {
  record: string | null;
  valid: boolean;
  policy: "pass" | "softfail" | "fail" | "neutral" | "none" | null;
}

interface DmarcResult {
  record: string | null;
  valid: boolean;
  policy: "none" | "quarantine" | "reject" | null;
  pct: number | null;
  rua: string | null;
}

interface DkimResult {
  selector: string;
  record: string | null;
  valid: boolean;
}

// ── Query ──────────────────────────────────────────────────────────────────

export async function query(domain: string): Promise<MailSecurityResult> {
  const [mxResp, spfResp, dmarcResp, dkimResp] = await Promise.all([
    dohQuery("cloudflare", domain, "MX").catch(() => null),
    dohQuery("cloudflare", domain, "TXT").catch(() => null),
    dohQuery("cloudflare", `_dmarc.${domain}`, "TXT").catch(() => null),
    dohQuery("cloudflare", `default._domainkey.${domain}`, "TXT").catch(() => null),
  ]);

  return {
    domain,
    mx: parseMx(mxResp),
    spf: parseSpf(spfResp),
    dmarc: parseDmarc(dmarcResp),
    dkim: parseDkim(dkimResp, "default"),
  };
}

// ── Parsers ────────────────────────────────────────────────────────────────

function parseMx(resp: Awaited<ReturnType<typeof dohQuery>> | null): MxRecord[] {
  if (!resp?.Answer) return [];
  return resp.Answer
    .filter((r) => r.type === 15) // MX record type
    .map((r) => {
      const parts = r.data.trim().split(/\s+/);
      return {
        priority: parseInt(parts[0], 10) || 0,
        exchange: parts[1]?.replace(/\.$/, "") ?? r.data,
      };
    })
    .sort((a, b) => a.priority - b.priority);
}

function parseSpf(resp: Awaited<ReturnType<typeof dohQuery>> | null): SpfResult {
  const txt = resp?.Answer
    ?.filter((r) => r.type === 16) // TXT record type
    .map((r) => r.data.replace(/^"|"$/g, ""))
    .find((v) => v.startsWith("v=spf1"));

  if (!txt) return { record: null, valid: false, policy: "none" };

  const policyMatch = txt.match(/[~?+-]all$/i);
  const policyChar = policyMatch?.[0][0];
  const policyMap: Record<string, SpfResult["policy"]> = {
    "+": "pass",
    "~": "softfail",
    "-": "fail",
    "?": "neutral",
  };

  return {
    record: txt,
    valid: true,
    policy: policyChar ? (policyMap[policyChar] ?? null) : null,
  };
}

function parseDmarc(resp: Awaited<ReturnType<typeof dohQuery>> | null): DmarcResult {
  const txt = resp?.Answer
    ?.filter((r) => r.type === 16)
    .map((r) => r.data.replace(/^"|"$/g, ""))
    .find((v) => v.startsWith("v=DMARC1"));

  if (!txt) return { record: null, valid: false, policy: null, pct: null, rua: null };

  const get = (tag: string): string | null =>
    txt.match(new RegExp(`(?:^|;)\\s*${tag}=([^;]+)`))?.[1]?.trim() ?? null;

  const policy = get("p");
  const pctStr = get("pct");

  return {
    record: txt,
    valid: true,
    policy: (["none", "quarantine", "reject"].includes(policy ?? "") ? policy : null) as DmarcResult["policy"],
    pct: pctStr !== null ? parseInt(pctStr, 10) : 100,
    rua: get("rua"),
  };
}

function parseDkim(
  resp: Awaited<ReturnType<typeof dohQuery>> | null,
  selector: string
): DkimResult {
  const txt = resp?.Answer
    ?.filter((r) => r.type === 16)
    .map((r) => r.data.replace(/^"|"$/g, ""))
    .find((v) => v.includes("v=DKIM1") || v.includes("p="));

  return {
    selector,
    record: txt ?? null,
    valid: !!txt,
  };
}

// ── Schemas ────────────────────────────────────────────────────────────────

const ParamsSchema = z.object({
  domain: z.string().openapi({
    param: { name: "domain", in: "path" },
    example: "example.com",
    title: "Domain name",
  }),
});

const MxSchema = z.object({
  priority: z.number().openapi({ example: 10 }),
  exchange: z.string().openapi({ example: "mail.example.com" }),
});

const SpfSchema = z
  .object({
    record: z.string().nullable().openapi({ example: "v=spf1 include:_spf.google.com ~all" }),
    valid: z.boolean().openapi({ example: true }),
    policy: z
      .enum(["pass", "softfail", "fail", "neutral", "none"])
      .nullable()
      .openapi({ example: "softfail", description: "+all=pass, ~all=softfail, -all=fail, ?all=neutral" }),
  })
  .openapi("SpfResult");

const DmarcSchema = z
  .object({
    record: z.string().nullable().openapi({ example: "v=DMARC1; p=reject; pct=100; rua=mailto:dmarc@example.com" }),
    valid: z.boolean().openapi({ example: true }),
    policy: z
      .enum(["none", "quarantine", "reject"])
      .nullable()
      .openapi({ example: "reject" }),
    pct: z.number().nullable().openapi({ example: 100, description: "Percentage of messages subject to filtering (default 100)" }),
    rua: z.string().nullable().openapi({ example: "mailto:dmarc@example.com", description: "Aggregate report URI" }),
  })
  .openapi("DmarcResult");

const DkimSchema = z
  .object({
    selector: z.string().openapi({ example: "default" }),
    record: z.string().nullable().openapi({ example: "v=DKIM1; k=rsa; p=MIIBIjAN..." }),
    valid: z.boolean().openapi({ example: true }),
  })
  .openapi("DkimResult");

const ResponseSchema = z
  .object({
    domain: z.string().openapi({ example: "example.com" }),
    mx: z.array(MxSchema),
    spf: SpfSchema,
    dmarc: DmarcSchema,
    dkim: DkimSchema,
  })
  .openapi("MailSecurity");

// ── Route ──────────────────────────────────────────────────────────────────

export const route = createRoute({
  tags: ["Domain"],
  method: "get",
  path: "/mail-security/{domain}",
  request: { params: ParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: ResponseSchema } },
      description: "SPF, DMARC, DKIM and MX analysis",
    },
  },
  description: "Email security analysis — MX records, SPF policy, DMARC policy, DKIM (default selector)",
  externalDocs: {
    description: "SPF RFC 7208",
    url: "https://www.rfc-editor.org/rfc/rfc7208",
  },
});
