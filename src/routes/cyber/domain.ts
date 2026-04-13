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
import { query as whoisQuery, route as whoisRoute } from "../../helpers/whois";
import {
  domainQuery as reputationQuery,
  domainRoute as reputationRoute,
} from "../../helpers/reputation";
import {
  query as mailSecurityQuery,
  route as mailSecurityRoute,
} from "../../helpers/mail-security";
import {
  queryHost as urlhausHostQuery,
  queryUrl as urlhausUrlQuery,
  domainThreatRoute,
  urlThreatRoute,
} from "../../helpers/urlhaus";

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
  return c.json({ A, AAAA, CNAME, TXT, NS, MX });
});

/* WHOIS */
domain.openapi(whoisRoute, async (c: any) => {
  const { domain } = c.req.valid("param");
  const response = await whoisQuery(domain);
  return c.json(response);
});

/* REPUTATION */
domain.openapi(reputationRoute, async (c: any) => {
  const { domain } = c.req.valid("param");
  const response = await reputationQuery(domain);
  return c.json(response);
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

/* DOMAIN THREAT (URLhaus) */
domain.openapi(domainThreatRoute, async (c: any) => {
  const { domain } = c.req.valid("param");
  try {
    return c.json(await urlhausHostQuery(domain));
  } catch (err: any) {
    return c.text(err.message, err.status ?? 500);
  }
});

/* URL THREAT (URLhaus) */
domain.openapi(urlThreatRoute, async (c: any) => {
  const { url } = c.req.valid("query");
  try {
    return c.json(await urlhausUrlQuery(url));
  } catch (err: any) {
    return c.text(err.message, err.status ?? 500);
  }
});
