import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

export const url = new OpenAPIHono();

const RedirectHopSchema = z.object({
  url: z.string(),
  status: z.number(),
  location: z.string().nullable(),
}).openapi("RedirectHop");

const redirectsRoute = createRoute({
  tags: ["URL"],
  method: "get",
  path: "/redirects",
  summary: "Follow the redirect chain of a URL",
  request: {
    query: z.object({
      url: z.string().openapi({ param: { name: "url", in: "query" }, example: "https://bit.ly/example" }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ hops: z.array(RedirectHopSchema) }) } },
      description: "Redirect hops from start URL to final destination",
    },
  },
});

url.openapi(redirectsRoute, async (c: any) => {
  const { url: startUrl } = c.req.valid("query");
  const hops: { url: string; status: number; location: string | null }[] = [];
  let current = startUrl;

  for (let i = 0; i < 10; i++) {
    let res: Response;
    try {
      res = await fetch(current, {
        method: "HEAD",
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; cybai.re/1.0)" },
      });
    } catch {
      break;
    }

    const status = res.status;
    const location = res.headers.get("location");
    hops.push({ url: current, status, location });

    if (status < 300 || status >= 400 || !location) break;

    try {
      current = new URL(location, current).href;
    } catch {
      break;
    }
  }

  return c.json({ hops });
});
