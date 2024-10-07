import { OpenAPIHono } from "@hono/zod-openapi";

import { query as crtQuery, route as crtRoute } from "../helpers/crt";
import { query as whoisQuery, route as whoisRoute } from "../helpers/whois";

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

/* DNS LOOKUP */

/* DNS QUERY */

/* WHOIS */
domain.openapi(whoisRoute, async (c: any) => {
  // TODO fix c type
  const { domain } = c.req.valid("param");
  const response = await whoisQuery(domain);
  return c.json(response);
});

/* REPUTATION */
