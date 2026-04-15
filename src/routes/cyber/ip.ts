import { OpenAPIHono } from "@hono/zod-openapi";

import { query as IPInfoQuery, route as IPInfoRoute } from "../../helpers/ipinfo";
import {
  query as reverseDNSQuery,
  route as reverseDNSRoute,
} from "../../helpers/reverse-dns";
import { query as shodanQuery, route as shodanRoute } from "../../helpers/shodan";

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

/* SHODAN INTERNETDB */
ip.openapi(shodanRoute, async (c: any) => {
  const { ip } = c.req.valid("param");
  try {
    return c.json(await shodanQuery(ip));
  } catch (err: any) {
    return c.text(err.message, err.status ?? 500);
  }
});
