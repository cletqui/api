# api.cybai.re

A single Cloudflare Worker serving two categories of public endpoints:

- **`/cyber/*`** — cybersecurity intelligence: domain info, IP info, ASN, CVE lookup, user-agent parsing
- **`/data/*`** — French tide data, weather, and apéritif customs

**Base URL:** `https://api.cybai.re`  
**Docs:** [`/docs`](https://api.cybai.re/docs) (Swagger UI) · [`/docs/json`](https://api.cybai.re/docs/json) (OpenAPI JSON)

---

## Cyber endpoints

All `/cyber/*` endpoints return JSON and allow any origin (`Access-Control-Allow-Origin: *`).

### Domain

| Method | Path | Description | Source |
|--------|------|-------------|--------|
| `GET` | `/cyber/domain/certs/{domain}` | Certificate transparency records | [crt.sh](https://crt.sh) |
| `GET` | `/cyber/domain/subdomains/{domain}` | Subdomain enumeration via CT logs | [crt.sh](https://crt.sh) |
| `GET` | `/cyber/domain/dns-query/{resolver}/{domain}` | DNS-over-HTTPS single record query | Cloudflare / Google / Quad9 |
| `GET` | `/cyber/domain/nslookup/{resolver}/{domain}` | Full NS lookup (A, AAAA, CNAME, TXT, NS, MX) | Cloudflare / Google / Quad9 |
| `GET` | `/cyber/domain/whois/{domain}` | RDAP/WHOIS registration data | [rdap.org](https://rdap.org) |
| `GET` | `/cyber/domain/reputation/{domain}` | Threat score, tags, abuse indicators | [Spamhaus](https://www.spamhaus.org) |
| `GET` | `/cyber/domain/mail-security/{domain}` | SPF, DMARC, DKIM, MX analysis | DoH (Cloudflare) |
| `GET` | `/cyber/domain/threat/{domain}` | Malware distribution history | [URLhaus](https://urlhaus.abuse.ch) |
| `GET` | `/cyber/domain/url/threat?url=` | Specific URL threat check | [URLhaus](https://urlhaus.abuse.ch) |

**DNS resolvers:** `cloudflare` · `google` · `quad9`

```bash
# Certificate transparency
curl "https://api.cybai.re/cyber/domain/certs/example.com?exclude=expired&deduplicate=Y"

# Full NS lookup via Cloudflare DoH
curl "https://api.cybai.re/cyber/domain/nslookup/cloudflare/example.com"

# Email security check
curl "https://api.cybai.re/cyber/domain/mail-security/example.com"

# URLhaus malware check
curl "https://api.cybai.re/cyber/domain/threat/example.com"
curl "https://api.cybai.re/cyber/domain/url/threat?url=http://malicious.example.com/payload.exe"
```

### IP

| Method | Path | Description | Source |
|--------|------|-------------|--------|
| `GET` | `/cyber/ip/info/{ip}` | Geolocation, ISP, ASN, mobile/proxy/hosting flags | [ip-api.com](https://ip-api.com) |
| `GET` | `/cyber/ip/reverse-dns/{ip}` | Reverse DNS lookup | [reversedns.io](https://reversedns.io) |
| `GET` | `/cyber/ip/reputation/{ip}` | Blocklist listings (XBL, SBL, DBL…) | [Spamhaus](https://www.spamhaus.org) |
| `GET` | `/cyber/ip/threat/{ip}` | Malware distribution history | [URLhaus](https://urlhaus.abuse.ch) |

```bash
curl "https://api.cybai.re/cyber/ip/info/1.1.1.1"
curl "https://api.cybai.re/cyber/ip/reputation/1.1.1.1"
curl "https://api.cybai.re/cyber/ip/threat/1.2.3.4"
```

### ASN

| Method | Path | Description | Source |
|--------|------|-------------|--------|
| `GET` | `/cyber/asn/{asn}` | ASN name, country, abuse contacts, RIR allocation | [BGPView](https://bgpview.io) |
| `GET` | `/cyber/asn/{asn}/prefixes` | IPv4/IPv6 prefix list for the ASN | [BGPView](https://bgpview.io) |

The `{asn}` parameter accepts `13335` or `AS13335`.

```bash
curl "https://api.cybai.re/cyber/asn/AS13335"
curl "https://api.cybai.re/cyber/asn/AS13335/prefixes"
```

### CVE

| Method | Path | Description | Source |
|--------|------|-------------|--------|
| `GET` | `/cyber/cve/{id}` | Full CVE record | [MITRE CVE API](https://www.cve.org) |

```bash
curl "https://api.cybai.re/cyber/cve/CVE-2021-44228"
```

### User-Agent

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cyber/ua?ua=` | Parse a user-agent string (falls back to request `User-Agent` header) |

```bash
curl "https://api.cybai.re/cyber/ua?ua=Mozilla/5.0+..."
# or let the API read your own UA:
curl "https://api.cybai.re/cyber/ua"
```

---

## Data endpoints

`/data/*` endpoints are restricted to known frontend origins (`tide.cybai.re`, `callot.cybai.re`, `apero.cybai.re`, and their Cloudflare Pages / GitHub Pages mirrors). `localhost`, `127.0.0.1`, `[::1]` (any port), and `null` origins (file://) are also allowed for local development.

### Tide

French harbour tide data scraped from [maree.info](https://maree.info). Raw data is cached in Cloudflare KV for 12 hours; `last_tide` / `next_tide` are always computed fresh.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/data/tide?harbour={name}` | Tide data for a harbour by name |
| `GET` | `/data/tide?id={id}` | Tide data for a harbour by maree.info ID |
| `GET` | `/data/tide/harbours` | Full harbour list (`id → name`) |
| `GET` | `/data/tide/harbours?name={name}` | Search harbour by name |
| `GET` | `/data/tide/harbours?id={id}` | Search harbour by ID |
| `GET` | `/data/tide/harbours?refresh` | Force-sync the D1 harbour registry from maree.info |

Response includes `forecast` (today), `last_tide`, `next_tide`, and a full `data` map for the week.

### Weather

| Method | Path | Description | Source |
|--------|------|-------------|--------|
| `GET` | `/data/weather?location={city}` | Weather data in wttr.in j1 format | [wttr.in](https://wttr.in) |

If `location` is omitted, falls back to Cloudflare geolocation (`cf.city`).

### Apéro

Global apéritif customs by timezone (~200 timezones covered).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/data/apero` | Full dataset keyed by continent and city |
| `GET` | `/data/apero?timezone=Europe/Paris` | Single timezone entry |

---

## Architecture

Built on [Cloudflare Workers](https://workers.cloudflare.com) with [Hono](https://hono.dev) and [zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi).

```
src/
  routes/cyber/     domain  ip  ua  cve  asn
  routes/data/      tide  weather  apero
  helpers/          cyber fetchers + Zod/OpenAPI schemas
  services/         tide KV cache, harbour D1 registry, weather
  scrapers/         maree-info.ts  wttr-in.ts
  types/            CloudflareEnv, tide types
  data/             apero.json (~200 KB static dataset)
```

**Cloudflare bindings:**
- `DB` — D1 database (`data-db`): harbour registry
- `TIDE_KV` — KV namespace: 12h tide data cache + 24h last-tide fallback

**Cron:** `0 3 * * *` — nightly harbour registry sync from maree.info

## Running locally

```bash
bun install
bun run dev                          # local dev server at localhost:8787
bunx wrangler dev --remote           # dev against real D1 + KV bindings
curl "localhost:8787/__scheduled?cron=0+3+*+*+*"  # trigger cron manually
bun run typecheck                    # TypeScript type check
bun run deploy                       # deploy to Cloudflare
```

## License

[MIT](LICENSE)
