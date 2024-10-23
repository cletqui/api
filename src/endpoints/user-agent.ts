import { OpenAPIHono } from "@hono/zod-openapi";

import { UAParser } from "ua-parser-js";
import { route as uaparserRoute } from "../helpers/uaparser";

export const userAgent = new OpenAPIHono();

/* USER-AGENT PARSE */
userAgent.openapi(uaparserRoute, (c: any) => {
  const { ua } = c.req.valid("query");
  console.log(ua);
  const userAgent = ua || c.req.header("user-agent");
  console.log(userAgent);
  return c.json(UAParser(userAgent));
});
