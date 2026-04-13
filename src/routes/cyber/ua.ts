import { OpenAPIHono } from "@hono/zod-openapi";
import { UAParser } from "ua-parser-js";
import { route as uaparserRoute } from "../../helpers/uaparser";

export const ua = new OpenAPIHono();

/* USER-AGENT PARSE */
ua.openapi(uaparserRoute, (c: any) => {
  const { ua } = c.req.valid("query");
  const userAgent = ua || c.req.header("user-agent");
  return c.json(UAParser(userAgent));
});
