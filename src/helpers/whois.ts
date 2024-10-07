import { OpenAPIHono, z, createRoute } from "@hono/zod-openapi";

/* QUERY */
interface WhoisResponse {} // TODO

export async function query(domain: string): Promise<WhoisResponse> {
  const url = `https://rdap.org/domain/${domain}`;
  console.log(url);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch data: ${response.status} ${response.statusText}`
    );
  } // TODO handle returned errors
  return (await response.json()) as Response;
}

/* SCHEMAS */
const ParamsSchema = z.object({
  domain: z.string({ required_error: "Domain is required." }).openapi({
    param: {
      name: "domain",
      in: "path",
    },
    example: "google.com",
    title: "Domain name",
  }),
});

const ResponseSchema = z.object({}); // TODO

/* ROUTE */
export const route = createRoute({
  tags: ["Domain"],
  method: "get",
  path: "/whois/{domain}",
  request: { params: ParamsSchema },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
      description: "Fetch whois data",
    },
  },
});
