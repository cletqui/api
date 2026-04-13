import { OpenAPIHono } from "@hono/zod-openapi";
import { query, route } from "../../helpers/cve";

export const cve = new OpenAPIHono();

/* CVE */
cve.openapi(route, async (c: any) => {
  const { id } = c.req.valid("param");
  const response = await query(id);
  return c.json(response);
});
