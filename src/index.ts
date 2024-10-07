import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";

import {
  name,
  version,
  description,
  repository,
  author,
  homepage,
  license,
} from "../package.json";
import { domain } from "./endpoints/domain";
import { ip } from "./endpoints/ip";

/* API */
const api = new OpenAPIHono();

/* MIDDLEWARES */
api.use(logger());
api.use(prettyJSON());
api.use("/*", cors({ origin: "*", allowMethods: ["GET"] }));

/* ROOT */
api.get("/", (c) => c.redirect("/docs"));

/* ROUTES */
api.route("/domain", domain);
api.route("/ip", ip);
// api.route("/dns-query", dnsQuery);
// api.route("/nslookup", nslookup);
// api.route("/ipinfo", ipInfo);
// api.route("/reputation/domain", reputationDomain);
// api.route("/reputation/ip", reputationIP);

/* SWAGGER */
api.get("/docs", swaggerUI({ url: "/docs/json" }));

/* JSON */
api.doc("/docs/json", {
  openapi: "3.0.0",
  info: {
    title: name,
    version: version,
    description: `[${description}](${homepage}) - [${repository.type}](${repository.url})`,
    contact: {
      name: author.name,
      url: `${repository.url}/issues`,
    },
    license: {
      name: license,
    },
  },
  //  servers: [{ url: homepage, description: "" }],
  tags: [
    {
      name: "Domain",
      description: "Domain Info",
    },
    {
      name: "IP",
      description: "IP Info",
    },
  ],
});

export default api;
