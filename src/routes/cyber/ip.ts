import { OpenAPIHono } from "@hono/zod-openapi";

import { query as IPInfoQuery, route as IPInfoRoute } from "../../helpers/ipinfo";
import {
  query as reverseDNSQuery,
  route as reverseDNSRoute,
} from "../../helpers/reverse-dns";
import {
  IPQuery as reputationQuery,
  IPRoute as reputationRoute,
} from "../../helpers/reputation";
import {
  queryHost as urlhausHostQuery,
  ipThreatRoute,
} from "../../helpers/urlhaus";

export const ip = new OpenAPIHono();

/* IP INFO */
ip.openapi(IPInfoRoute, async (c: any) => {
  const { ip } = c.req.valid("param");
  const response = await IPInfoQuery(ip);
  return c.json(response);
});

/* REVERSE DNS */
ip.openapi(reverseDNSRoute, async (c: any) => {
  const { ip } = c.req.valid("param");
  const response = await reverseDNSQuery(ip);
  return c.json(response);
});

/* REPUTATION */
ip.openapi(reputationRoute, async (c: any) => {
  const { ip } = c.req.valid("param");
  const response = await reputationQuery(ip);
  return c.json(response);
});

/* IP THREAT (URLhaus) */
ip.openapi(ipThreatRoute, async (c: any) => {
  const { ip } = c.req.valid("param");
  try {
    return c.json(await urlhausHostQuery(ip));
  } catch (err: any) {
    return c.text(err.message, err.status ?? 500);
  }
});
