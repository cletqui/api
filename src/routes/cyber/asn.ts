import { OpenAPIHono } from "@hono/zod-openapi";
import {
  queryAsn,
  queryAsnPrefixes,
  asnRoute,
  asnPrefixesRoute,
} from "../../helpers/asn";

export const asn = new OpenAPIHono();

/* ASN INFO */
asn.openapi(asnRoute, async (c: any) => {
  const { asn } = c.req.valid("param");
  try {
    return c.json(await queryAsn(asn));
  } catch (err: any) {
    return c.text(err.message, err.status ?? 500);
  }
});

/* ASN PREFIXES */
asn.openapi(asnPrefixesRoute, async (c: any) => {
  const { asn } = c.req.valid("param");
  try {
    return c.json(await queryAsnPrefixes(asn));
  } catch (err: any) {
    return c.text(err.message, err.status ?? 500);
  }
});
