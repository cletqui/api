import { OpenAPIHono } from "@hono/zod-openapi";

import {
  query as DoHQuery,
  DNSQueryRoute,
  NSLookupRoute,
} from "../helpers/doh";
import {
  query as crtQuery,
  route as crtRoute,
  subdomainsRoute,
} from "../helpers/crt";
import { query as whoisQuery, route as whoisRoute } from "../helpers/whois";
import {
  domainQuery as reputationQuery,
  domainRoute as reputationRoute,
} from "../helpers/reputation";

export const domain = new OpenAPIHono();

/* CERTS */
domain.openapi(crtRoute, async (c: any) => {
  // TODO fix c type
  const { domain } = c.req.valid("param");
  const { exclude, deduplicate } = c.req.valid("query");
  const response = await crtQuery(domain, exclude, deduplicate);
  return c.json(response);
});

/* SUBDOMAINS */
domain.openapi(subdomainsRoute, async (c: any) => {
  // TODO fix c type
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
  // TODO fix c type
  const { type, DO, CD } = c.req.valid("query");
  const { resolver, domain } = c.req.valid("param");
  const response = await DoHQuery(resolver, domain, type, DO, CD);
  return c.json(response);
});

/* DNS LOOKUP */
domain.openapi(NSLookupRoute, async (c: any) => {
  // TODO fix c type
  const { resolver, domain } = c.req.valid("param");
  const [A, AAAA, CNAME, TXT, NS, MX] = await Promise.all([
    DoHQuery(resolver, domain, "A"),
    DoHQuery(resolver, domain, "AAAA"),
    DoHQuery(resolver, domain, "CNAME"),
    DoHQuery(resolver, domain, "TXT"),
    DoHQuery(resolver, domain, "NS"),
    DoHQuery(resolver, domain, "MX"),
  ]);
  const response = { A, AAAA, CNAME, TXT, NS, MX };
  return c.json(response);
});

/* WHOIS */
domain.openapi(whoisRoute, async (c: any) => {
  // TODO fix c type
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
