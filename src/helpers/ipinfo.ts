import { z, createRoute } from "@hono/zod-openapi";

/* QUERY */
interface Response {
  ipVersion: number;
  ipAddress: string;
  latitude: number;
  longitude: number;
  countryName: string;
  countryCode: string;
  timeZone: string;
  zipCode: string;
  cityName: string;
  regionName: string;
  continent: string;
  continentCode: string;
  isProxy: boolean;
  currency: {
    code: string;
    name: string;
  };
  language: string;
  timeZones: string[];
  tlds: string[];
}

export async function query(ip: string): Promise<Response> {
  const url = `https://freeipapi.com/api/json/${ip}`;
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
    example: "162.10.209.81",
    title: "IP",
  }),
});

const ResponseSchema = z
  .object({
    ipVersion: z.number().openapi({ example: 4 }),
    ipAddress: z.string().openapi({ example: "162.10.209.81" }),
    latitude: z.number().openapi({ example: 48.859077 }),
    longitude: z.number().openapi({ example: 2.293486 }),
    countryName: z.string().openapi({ example: "France" }),
    countryCode: z.string().openapi({ example: "FR" }),
    timeZone: z.string().openapi({ example: "+01:00" }),
    zipCode: z.string().openapi({ example: "75000" }),
    cityName: z.string().openapi({ example: "Paris" }),
    regionName: z.string().openapi({ example: "Ile-de-France" }),
    continent: z.string().openapi({ example: "Europe" }),
    continentCode: z.string().openapi({ example: "EU" }),
    isProxy: z.boolean().openapi({ example: false }),
    currency: z.object({
      code: z.string().openapi({ example: "EUR" }),
      name: z.string().openapi({ example: "Euro" }),
    }),
    language: z.string().openapi({ example: "French" }),
    timeZones: z.array(z.string().openapi({ example: "Europe/Paris" })),
    tlds: z.array(z.string().openapi({ example: ".fr" })),
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
    description: "freeipapi.com",
    url: "https://freeipapi.com/",
  },
});
