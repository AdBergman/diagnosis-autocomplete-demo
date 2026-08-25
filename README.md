# Generic server-backed autocomplete demo

A small reference application that uses one lightweight, generic React Aria autocomplete for two independently searched catalogues:

- 12,000 synthetic human and veterinary diagnoses
- 1,000 synthetic Swedish veterinary clinics

> **Synthetic demonstration data. Not for clinical, veterinary, or administrative use.**

## What this demonstrates

```text
12,000 diagnoses ──→ Spring search API ──┐
                                         ├─→ AsyncAutocomplete<T, Cursor>
 1,000 clinics ────→ Spring search API ──┘
```

Both source files are deliberately unordered. The clinic catalogue contains unique names and unique, Luhn-valid organisation numbers in the Swedish `NNNNNN-NNNN` display format.

## Technology

- Java 25 and Spring Boot 4.1.1
- Maven 3.9.16 through the committed Maven Wrapper
- React 19.2.8 and strict TypeScript 6.0.3
- Vite 8.2.2
- React Aria Components 1.20.0
- Node.js 24.19.0 LTS and pnpm 11.24.0
- JUnit 5, AssertJ, Vitest, Testing Library, Playwright, and axe-core

## Architecture

Spring loads and validates `diagnoses.json` and `veterinary-clinics.json` once at startup, then retains both immutable catalogues in memory. Each endpoint normalizes the query, ranks matches deterministically, and returns only the requested page. The browser never downloads a complete catalogue.

The frontend's `AsyncAutocomplete<T, Cursor>` owns the shared React Aria behavior. It accepts a typed loader, arbitrary item keys and renderers, configurable accessible text, arbitrary cursor types, controlled or uncontrolled selection, and a selection callback. It uses React Aria's actual `Autocomplete`, `useAsyncList`, and collection behavior, plus an abortable configurable debounce and `ListBoxLoadMoreItem` paging.

`DiagnosisAutocomplete` and `VeterinaryClinicAutocomplete` are thin domain adapters. They supply their API loader, item shape, labels, rendering, and selected-value presentation without duplicating the async or accessible interaction logic. Component CSS is locally imported and all React Aria selectors are scoped beneath `.async-autocomplete`.

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

The full-stack browser test starts both applications, exercises both autocomplete adapters, and runs axe-core:

```bash
cd frontend
pnpm exec playwright install chromium
pnpm test:e2e
```

## APIs

Both endpoints support optional `q`, `page`, and `size` parameters. The default page size is 20 and the maximum is 50.

### Diagnoses

```bash
curl 'http://localhost:8080/api/diagnoses?page=0&size=20'
curl 'http://localhost:8080/api/diagnoses?q=renal&page=0&size=20'
curl 'http://localhost:8080/api/diagnoses?q=VET-0042&page=0&size=20'
```

Diagnosis searches cover `code` and `description`.

### Veterinary clinics

```bash
curl 'http://localhost:8080/api/veterinary-clinics?page=0&size=20'
curl 'http://localhost:8080/api/veterinary-clinics?q=malmo%20park&page=0&size=20'
curl 'http://localhost:8080/api/veterinary-clinics?q=5591001622&page=0&size=20'
```

Clinic searches cover `name` and `organisationNumber`. Organisation-number queries tolerate omission of the dash.

Responses use the same application-owned page shape:

```json
{
  "items": [
    {
      "name": "Malmö Park Djursjukhus",
      "organisationNumber": "559100-1622"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1,
  "hasNext": false
}
```

Blank searches browse in stable human-friendly order. Nonblank searches are case, whitespace, separator, and diacritic tolerant. Invalid paging returns an RFC 9457 Problem Detail response.

The deterministic clinic fixture can be regenerated with:

```bash
node backend/scripts/generate-veterinary-clinics.mjs
```
