# api.cybai.re

A single Cloudflare Worker serving two categories of public endpoints:

- **`/cyber/*`** — cybersecurity intelligence: domain, IP, hash, ASN, CVE, user-agent, URL. Open CORS.
- **`/data/*`** — French tide data, weather, and apéritif customs. Restricted CORS.

**Base URL:** `https://api.cybai.re`  
**Docs:** [`/docs`](https://api.cybai.re/docs) (Swagger UI) · [`/docs/json`](https://api.cybai.re/docs/json) (OpenAPI JSON)

---

## Cyber endpoints

All `/cyber/*` endpoints return JSON with `Access-Control-Allow-Origin: *`.

### Domain

| Method | Path | Description | Source |
|--------|------|-------------|--------|
| `GET` | `/cyber/domain/certs/{domain}` | Certificate transparency records | [crt.sh](https://crt.sh) |
| `GET` | `/cyber/domain/nslookup/{resolver}/{domain}` | Full NS lookup (A, AAAA, CNAME, TXT, NS, MX) | Cloudflare / Google / Quad9 |
| `GET` | `/cyber/domain/whois/{domain}` | RDAP/WHOIS registration data | IANA RDAP |
| `GET` | `/cyber/domain/mail-security/{domain}` | SPF, DMARC, DKIM, MX analysis | DoH |

**DNS resolvers:** `cloudflare` · `google` · `quad9`

```bash
curl "https://api.cybai.re/cyber/domain/certs/example.com?exclude=expired&deduplicate=Y"
curl "https://api.cybai.re/cyber/domain/nslookup/cloudflare/example.com"
curl "https://api.cybai.re/cyber/domain/mail-security/example.com"
```

### IP

| Method | Path | Description | Source |
|--------|------|-------------|--------|
| `GET` | `/cyber/ip/me` | Caller's public IP (reads `CF-Connecting-IP`) | — |
| `GET` | `/cyber/ip/info/{ip}` | Geolocation, ISP, ASN, mobile/proxy/hosting flags | [ip-api.com](https://ip-api.com) |
| `GET` | `/cyber/ip/reverse-dns/{ip}` | Reverse DNS (PTR) lookup | Cloudflare DoH |
| `GET` | `/cyber/ip/shodan/{ip}` | Open ports, CVEs, hostnames | [Shodan InternetDB](https://internetdb.shodan.io) |
| `GET` | `/cyber/ip/whois/{ip}` | IP WHOIS / allocation data | [RIPEstat](https://stat.ripe.net) |
| `GET` | `/cyber/ip/reputation/{ip}` | Spam/abuse listings, Tor exit detection | [StopForumSpam](https://www.stopforumspam.com) |

```bash
curl "https://api.cybai.re/cyber/ip/me"
curl "https://api.cybai.re/cyber/ip/info/1.1.1.1"
curl "https://api.cybai.re/cyber/ip/reputation/1.1.1.1"
curl "https://api.cybai.re/cyber/ip/shodan/1.1.1.1"
```

### Hash

| Method | Path | Description | Source |
|--------|------|-------------|--------|
| `GET` | `/cyber/hash/{hash}` | Malware sample info — MD5, SHA-1, or SHA-256 | [MalwareBazaar](https://bazaar.abuse.ch) |

```bash
curl "https://api.cybai.re/cyber/hash/094fd325049b8a9cf6d3e5ef2a6d4cc6a567d7d49c35f8bb8dd9e3c6acf3d78d"
```

### URL

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cyber/url/redirects?url=` | Follow redirect chain (up to 10 hops) |

```bash
curl "https://api.cybai.re/cyber/url/redirects?url=https://bit.ly/example"
```

### ASN

| Method | Path | Description | Source |
|--------|------|-------------|--------|
| `GET` | `/cyber/asn/{asn}` | ASN name, country, type | [BGPView](https://bgpview.io) |
| `GET` | `/cyber/asn/{asn}/prefixes` | IPv4/IPv6 prefix list | [BGPView](https://bgpview.io) |

The `{asn}` parameter accepts `13335` or `AS13335`.

### CVE

| Method | Path | Description | Source |
|--------|------|-------------|--------|
| `GET` | `/cyber/cve/{id}` | Full CVE record, CVSS score, references | [MITRE CVE API](https://www.cve.org) |

```bash
curl "https://api.cybai.re/cyber/cve/CVE-2021-44228"
```

### User-Agent

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cyber/ua?ua=` | Parse a UA string (falls back to request `User-Agent` header) |

---

## Data endpoints

`/data/*` is restricted to known frontend origins (`tide.cybai.re`, `callot.cybai.re`, `apero.cybai.re` and their mirrors). `localhost` and `null` (file://) are allowed for local dev.

### Tide

French harbour tide data scraped from [maree.info](https://maree.info). Cached in KV for 12h.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/data/tide?harbour={name}` | Tide data by harbour name |
| `GET` | `/data/tide?id={id}` | Tide data by maree.info ID |
| `GET` | `/data/tide/harbours` | Full harbour list |
| `GET` | `/data/tide/harbours?name={name}` | Search by name |

### Weather

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/data/weather?location={city}` | [wttr.in](https://wttr.in) |

### Apéro

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/data/apero` | Full dataset keyed by continent/city |
| `GET` | `/data/apero?timezone=Europe/Paris` | Single timezone entry |

---

## Architecture

Built with [Hono](https://hono.dev) + [zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi) on Cloudflare Workers.

```
src/
  routes/cyber/     domain  ip  ua  cve  asn  hash  url
  routes/data/      tide  weather  apero
  helpers/          cyber fetchers + Zod/OpenAPI schemas (collocated)
  services/         tide KV cache, harbour D1 registry, weather
  scrapers/         maree-info.ts  wttr-in.ts
  data/             apero.json (~200 KB)
```

**Bindings:** `DB` (D1 — harbour registry) · `TIDE_KV` (KV — 12h tide cache)  
**Cron:** `0 3 * * *` — nightly harbour registry sync

## Running locally

```bash
bun install
bun run dev                          # localhost:8787
bunx wrangler dev --remote           # dev against real D1 + KV
curl "localhost:8787/__scheduled?cron=0+3+*+*+*"
bun run typecheck
bun run deploy
```

## License

[MIT](LICENSE)
