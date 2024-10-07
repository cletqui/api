import { OpenAPIHono } from "@hono/zod-openapi";

import { query as IPInfoQuery, route as IPInfoRoute } from "../helpers/ipinfo";
import {
  query as reverseDNSQuery,
  route as reverseDNSRoute,
} from "../helpers/reverse-dns";
import {
  IPQuery as reputationQuery,
  IPRoute as reputationRoute,
} from "../helpers/reputation";

export const ip = new OpenAPIHono();

/* IP INFO */
ip.openapi(IPInfoRoute, async (c: any) => {
  const { ip } = c.req.valid("param");
  const response = await IPInfoQuery(ip);
  return c.json(response);
});

/* REVERSE DNS */
ip.openapi(reverseDNSRoute, async (c: any) => {
  // TODO fix c type
  const { ip } = c.req.valid("param");
  console.log(ip);
  const response = await reverseDNSQuery(ip);
  return c.json(response);
});

/* REPUTATION */
ip.openapi(reputationRoute, async (c: any) => {
  const { ip } = c.req.valid("param");
  const response = await reputationQuery(ip);
  return c.json(response);
});
