import { cors } from "hono/cors";
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
import { dnsQuery, nslookup } from "./endpoints/doh";
import { whois } from "./endpoints/whois";
import { ipInfo } from "./endpoints/ipinfo";
import { reverseDns } from "./endpoints/reverse-dns";
import { reputationDomain, reputationIP } from "./endpoints/reputation";

const app = new OpenAPIHono();

/* CORS */
app.use("/*", cors({ origin: "*", allowMethods: ["GET", "POST"] }));

/* ROOT */
app.get("/", (c) => c.redirect("/docs"));

/* ROUTES */
app.route("/domain", domain);
app.route("/dns-query", dnsQuery);
app.route("/nslookup", nslookup);
app.route("/whois", whois);
app.route("/ipinfo", ipInfo);
app.route("/reverse-dns", reverseDns);
app.route("/reputation/domain", reputationDomain);
app.route("/reputation/ip", reputationIP);

/* SWAGGER */
app.get("/docs", swaggerUI({ url: "/docs/json" }));

/* JSON */
app.doc("/docs/json", {
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
  servers: [{ url: homepage, description: "" }],
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

export default app;
