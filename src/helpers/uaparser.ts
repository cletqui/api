import { z, createRoute } from "@hono/zod-openapi";

/* SCHEMA */
const QuerySchema = z.object({
  ua: z
    .string()
    .optional()
    .openapi({
      param: {
        name: "ua",
        in: "query",
      },
      example:
        "Mozilla/5.0 (Linux; Android 10; STK-LX1 Build/HONORSTK-LX1; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/110.0.5481.153 Mobile Safari/537.36 musical_ly_2022803040 JsSdk/1.0 NetType/WIFI Channel/huaweiadsglobal_int AppName/musical_ly app_version/28.3.4 ByteLocale/en ByteFullLocale/en Region/IQ Spark/1.2.7-alpha.8 AppVersion/28.3.4 PIA/1.5.11 BytedanceWebview/d8a21c6",
      title: "User-Agent",
    }),
});

const ResponseSchema = z.object({
  ua: z.string().openapi({
    example:
      "Mozilla/5.0 (Linux; Android 10; STK-LX1 Build/HONORSTK-LX1; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/110.0.5481.153 Mobile Safari/537.36 musical_ly_2022803040 JsSdk/1.0 NetType/WIFI Channel/huaweiadsglobal_int AppName/musical_ly app_version/28.3.4 ByteLocale/en ByteFullLocale/en Region/IQ Spark/1.2.7-alpha.8 AppVersion/28.3.4 PIA/1.5.11 BytedanceWebview/d8a21c6",
  }),
  browser: z.object({
    name: z.string().optional().openapi({ example: "TikTok" }),
    version: z.string().optional().openapi({ example: "28.3.4" }),
    major: z.string().optional().openapi({ example: "28" }),
  }),
  cpu: z.object({
    architecture: z.string().optional().openapi({ example: undefined }),
  }),
  device: z.object({
    type: z.string().optional().openapi({ example: "mobile" }),
    model: z.string().optional().openapi({ example: "STK-LX1" }),
    vendor: z.string().optional().openapi({ example: "Huawei" }),
  }),
  engine: z.object({
    name: z.string().optional().openapi({ example: "Blink" }),
    version: z.string().optional().openapi({ example: "110.0.5481.153" }),
  }),
  os: z.object({
    name: z.string().optional().openapi({ example: "Android" }),
    version: z.string().optional().openapi({ example: "10" }),
  }),
});

/* ROUTE */
export const route = createRoute({
  tags: ["User-Agent"],
  method: "get",
  path: "/",
  request: { query: QuerySchema },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
      description: "Parse user-agent",
    },
  },
});
