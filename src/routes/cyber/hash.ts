import { OpenAPIHono } from "@hono/zod-openapi";
import { query as malwareBazaarQuery, route as malwareBazaarRoute } from "../../helpers/malwarebazaar";

export const hash = new OpenAPIHono();

/* SHA-256 HASH LOOKUP (MalwareBazaar) */
hash.openapi(malwareBazaarRoute, async (c: any) => {
  const { hash } = c.req.valid("param");
  const result = await malwareBazaarQuery(hash);
  return c.json(result);
});
