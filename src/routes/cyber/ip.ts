import { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";

import { query as IPInfoQuery, route as IPInfoRoute } from "../../helpers/ipinfo";
import {
  query as reverseDNSQuery,
  route as reverseDNSRoute,
} from "../../helpers/reverse-dns";
import { query as shodanQuery, route as shodanRoute } from "../../helpers/shodan";
import { ipQuery as whoisQuery, ipRoute as whoisRoute } from "../../helpers/whois";
import { query as stopForumSpamQuery, route as stopForumSpamRoute } from "../../helpers/stopforumspam";

export const ip = new OpenAPIHono();

/* MY IP */
const meRoute = createRoute({
  method: "get",
  path: "/me",
  summary: "Detect caller's public IP",
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ ip: z.string() }) } },
      description: "Caller's public IP address",
    },
  },
});

ip.openapi(meRoute, (c: any) => {
  const ip =
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For")?.split(",")[0].trim() ??
    "unknown";
  return c.json({ ip });
});

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

/* IP WHOIS */
ip.openapi(whoisRoute, async (c: any) => {
  const { ip } = c.req.valid("param");
  try {
    return c.json(await whoisQuery(ip));
  } catch (err: any) {
    return c.text(err.message, err.status ?? 500);
  }
});

/* STOPFORUMSPAM REPUTATION */
ip.openapi(stopForumSpamRoute, async (c: any) => {
  const { ip } = c.req.valid("param");
  try {
    return c.json(await stopForumSpamQuery(ip));
  } catch (err: any) {
    return c.text(err.message, err.status ?? 500);
  }
});
