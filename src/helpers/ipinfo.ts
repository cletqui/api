import { z, createRoute } from "@hono/zod-openapi";

/* QUERY */
interface Response {
  query: string;
  status: string;
  continent: string;
  continentCode: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  district: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  offset: number;
  currency: string;
  isp: string;
  org: string;
  as: string;
  asname: string;
  reverse: string;
  mobile: boolean;
  proxy: boolean;
  hosting: boolean;
}

export async function query(ip: string): Promise<Response> {
  const url = `http://ip-api.com/json/${ip}?fields=status,message,continent,continentCode,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,as,asname,reverse,mobile,proxy,hosting`;
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
  ip: z.string({ required_error: "IP is required." }).openapi({
    param: {
      name: "ip",
      in: "path",
    },
    example: "1.1.1.1",
    title: "IP",
  }),
});

const ResponseSchema = z
  .object({
    query: z.string().openapi({ example: "1.1.1.1" }),
    status: z.string().openapi({ example: "success" }),
    continent: z.string().openapi({ example: "Oceania" }),
    continentCode: z.string().openapi({ example: "OC" }),
    country: z.string().openapi({ example: "Australia" }),
    countryCode: z.string().openapi({ example: "AU" }),
    region: z.string().openapi({ example: "QLD" }),
    regionName: z.string().openapi({ example: "Queensland" }),
    city: z.string().openapi({ example: "South Brisbane" }),
    district: z.string().openapi({ example: "" }),
    zip: z.string().openapi({ example: "4101" }),
    lat: z.number().openapi({ example: -27.4766 }),
    lon: z.number().openapi({ example: 153.0166 }),
    timeZone: z.string().openapi({ example: "Australia/Brisbane" }),
    offset: z.number().openapi({ example: 36000 }),
    currency: z.string().openapi({ example: "AUD" }),
    isp: z.string().openapi({ example: "Cloudflare, Inc" }),
    org: z
      .string()
      .openapi({ example: "APNIC and Cloudflare DNS Resolver project" }),
    as: z.string().openapi({ example: "AS13335 Cloudflare, Inc." }),
    asname: z.string().openapi({ example: "CLOUDFLARENET" }),
    reverse: z.string().openapi({ example: "one.one.one.one" }),
    mobile: z.boolean().openapi({ example: false }),
    proxy: z.boolean().openapi({ example: false }),
    hosting: z.boolean().openapi({ example: true }),
  })
  .openapi("IP Info");

/* ROUTE */
export const route = createRoute({
  tags: ["IP"],
  method: "get",
  path: "/info/{ip}",
  request: { params: ParamsSchema },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
      description: "Fetch IP info data",
    },
  },
  externalDocs: {
    description: "ip-api.com", // "freeipapi.com",
    url: "https://ip-api.com/", // "https://freeipapi.com/",
  },
});
