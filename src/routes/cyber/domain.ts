import { OpenAPIHono } from "@hono/zod-openapi";

import {
  query as DoHQuery,
  DNSQueryRoute,
  NSLookupRoute,
} from "../../helpers/doh";
import {
  query as crtQuery,
  route as crtRoute,
  subdomainsRoute,
} from "../../helpers/crt";
import {
  query as mailSecurityQuery,
  route as mailSecurityRoute,
} from "../../helpers/mail-security";
import {
  domainQuery as whoisQuery,
  domainRoute as whoisRoute,
} from "../../helpers/whois";

export const domain = new OpenAPIHono();

/* WHOIS */
domain.openapi(whoisRoute, async (c: any) => {
  const { domain } = c.req.valid("param");
  try {
    return c.json(await whoisQuery(domain));
  } catch (err: any) {
    return c.text(err.message, err.status ?? 500);
  }
});

/* CERTS — queries both the domain and %.domain, returns combined results */
domain.openapi(crtRoute, async (c: any) => {
  const { domain } = c.req.valid("param");
  const { exclude, deduplicate } = c.req.valid("query");
  const [exact, wildcard] = await Promise.allSettled([
    crtQuery(domain, exclude, deduplicate),
    crtQuery(`%.${domain}`, exclude, deduplicate),
  ]);
  if (exact.status === "rejected" && wildcard.status === "rejected") {
    return c.text(`crt.sh lookup failed: ${exact.reason?.message}`, 500);
  }
  const all = [
    ...(exact.status === "fulfilled" ? exact.value : []),
    ...(wildcard.status === "fulfilled" ? wildcard.value : []),
  ];
  const seen = new Set<number>();
  return c.json(all.filter((cert) => {
    if (seen.has(cert.id)) return false;
    seen.add(cert.id);
    return true;
  }));
});

/* SUBDOMAINS */
domain.openapi(subdomainsRoute, async (c: any) => {
  const { domain } = c.req.valid("param");
  const response = await crtQuery(domain);
  const subdomains = [
    ...new Set(
      response
        .map((obj) => obj.common_name)
        .filter((name) => !name.startsWith("*"))
    ),
  ];
  return c.json(subdomains);
});

/* DNS QUERY */
domain.openapi(DNSQueryRoute, async (c: any) => {
  const { type, DO, CD } = c.req.valid("query");
  const { resolver, domain } = c.req.valid("param");
  const response = await DoHQuery(resolver, domain, type, DO, CD);
  return c.json(response);
});

/* DNS LOOKUP */
domain.openapi(NSLookupRoute, async (c: any) => {
  const { resolver, domain } = c.req.valid("param");
  const [A, AAAA, CNAME, TXT, NS, MX] = await Promise.all([
    DoHQuery(resolver, domain, "A"),
    DoHQuery(resolver, domain, "AAAA"),
    DoHQuery(resolver, domain, "CNAME"),
    DoHQuery(resolver, domain, "TXT"),
    DoHQuery(resolver, domain, "NS"),
    DoHQuery(resolver, domain, "MX"),
  ]);
  return c.json({
    A: A.Answer ?? [],
    AAAA: AAAA.Answer ?? [],
    CNAME: CNAME.Answer ?? [],
    TXT: TXT.Answer ?? [],
    NS: NS.Answer ?? [],
    MX: MX.Answer ?? [],
  });
});

/* MAIL SECURITY */
domain.openapi(mailSecurityRoute, async (c: any) => {
  const { domain } = c.req.valid("param");
  try {
    return c.json(await mailSecurityQuery(domain));
  } catch (err: any) {
    return c.text(err.message, err.status ?? 500);
  }
});
