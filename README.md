# API

## Table of Contents

- [API](#api)
  - [Table of Contents](#table-of-contents)
  - [Motivation](#motivation)
  - [URLs](#urls)
    - [Swagger](#swagger)
    - [Endpoints](#endpoints)
  - [Roadmap](#roadmap)
  - [Endpoints ideas](#endpoints-ideas)

## Motivation

Cyber API on the go, deploy endpoints for cybersecurity actions.

## URLs

[api.cybai.re](https://api.cybai.re/)

### Swagger

[Swagger](https://api.cybai.re/swagger)
[Swagger JSON](https://api.cybai.re/swagger/json)

### Endpoints

    /dns-query: DNS records
    /certs : Certificate Transparency
    /ipinfo: Fetch IP information
    /whois: Fetch IP/domain whois information

## Roadmap

- [x] Add more DoH resolvers to resolvers.json
- [ ] Improve `README.md`
- [ ] Handle errors returned by DoH or crt.sh
- [ ] Validation based on { content: `application/json` } header
- [ ] Add more parameters for CRT ("limit" to limit the number of certificates returned)
- [ ] Implement [IP Info](https://freeipapi.com/api/json/{ip}) endpoint
- [ ] Implement [Whois](https://rdap.org/domain/{domain}) endpoint
- [ ] Implement Spamhaus endpoint for [domains](https://www.spamhaus.org/api/v1/sia-proxy/api/intel/v2/byobject/domain/malakoffhumanis.com/overview) and [IP](https://www.spamhaus.org/api/v1/sia-proxy/api/intel/v1/byobject/cidr/ALL/listings/live/{ip})
- [ ] Fix the linting issue in `doh.ts`
- [ ] Add more methods for the endpoints
- [ ] Implement authentication (JWT, Bearer, Basic...)
- [ ] When linked with frontends, implement CSRF Protection or IP Restriction

## Endpoints ideas

Web Related Endpoints

    /header: Fetch website header
    /pages: Fetch all website pages
    /ping: Ping domain to check latency and status
