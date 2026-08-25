# Diagnosis autocomplete demo

A small reference application for serving a large, unordered catalogue through deterministic server-side search and paging, then consuming it with an accessible React Aria autocomplete.

> **Synthetic demonstration data. Not for clinical or veterinary use.**

## What this demonstrates

```text
12,000 unsorted JSON diagnoses
             ↓
Spring Boot search + relevance + paging
             ↓
React Aria useAsyncList + Autocomplete
```

The catalogue contains an even mixture of synthetic human (`HUM-`) and veterinary (`VET-`) entries. It is intentionally not a clinical coding standard.

## Technology

- Java 25 and Spring Boot 4.1.1
- Maven 3.9.16 through the committed Maven Wrapper
- React 19.2.8 and TypeScript 6.0.3
- Vite 8.2.2
- React Aria Components 1.20.0
- Node.js 24.19.0 LTS and pnpm 11.24.0
- JUnit 5, AssertJ, Vitest, Testing Library, Playwright, and axe-core

## Architecture

Spring loads and validates `diagnoses.json` once at startup, then keeps 12,000 small immutable records in memory. A database would add machinery without helping an immutable catalogue of this size. Every request scans the catalogue, normalizes the query, ranks matches deterministically, and returns only the requested page.

The frontend uses React Aria's actual `Autocomplete` rather than `ComboBox`. `useAsyncList` owns loading, filter text, cancellation, errors, and the numeric cursor that maps to Spring's next page. An abortable 250 ms pause debounces searches, native `fetch` receives the supplied `AbortSignal`, and `ListBoxLoadMoreItem` requests the next page from within the autocomplete result list. The browser never downloads the complete catalogue.

## Run locally

Prerequisites are Java 25, Node.js 24.19 or newer, and pnpm 11.24.

Start the backend:

```bash
cd backend
./mvnw spring-boot:run
```

In another terminal, start the frontend:

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:5173`. Vite proxies relative `/api` requests to Spring on port 8080, so wildcard CORS is unnecessary.

## Verify

Backend:

```bash
cd backend
./mvnw verify
```

Frontend:

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The one full-stack browser test starts both applications itself:

```bash
cd frontend
pnpm exec playwright install chromium
pnpm test:e2e
```

## API

`GET /api/diagnoses` supports optional `q`, `page`, and `size` parameters. The default page size is 20 and the maximum is 50.

```bash
curl 'http://localhost:8080/api/diagnoses?page=0&size=20'
curl 'http://localhost:8080/api/diagnoses?q=renal&page=0&size=20'
curl 'http://localhost:8080/api/diagnoses?q=VET-0042&page=0&size=20'
```

Responses use an application-owned shape:

```json
{
  "items": [
    {
      "code": "VET-004281",
      "description": "Synthetic canine renal inflammatory disorder"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 137,
  "totalPages": 7,
  "hasNext": true
}
```

Blank searches browse the catalogue in stable description/code order. Nonblank searches are case, whitespace, separator, and diacritic tolerant and rank exact codes and prefixes ahead of broader description matches. Invalid paging returns an RFC 9457 Problem Detail response.
