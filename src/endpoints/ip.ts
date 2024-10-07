import { OpenAPIHono } from "@hono/zod-openapi";

import {
  query as reverseDNSQuery,
  route as reverseDNSRoute,
} from "../helpers/reverse-dns";

export const ip = new OpenAPIHono();

/* REVERSE DNS */
ip.openapi(reverseDNSRoute, async (c: any) => {
  // TODO fix c type
  const { ip } = c.req.valid("param");
  console.log(ip);
  const response = await reverseDNSQuery(ip);
  return c.json(response);
});
