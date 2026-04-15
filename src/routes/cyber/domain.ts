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

export const domain = new OpenAPIHono();

/* CERTS */
domain.openapi(crtRoute, async (c: any) => {
  const { domain } = c.req.valid("param");
  const { exclude, deduplicate } = c.req.valid("query");
  const response = await crtQuery(domain, exclude, deduplicate);
  return c.json(response);
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
