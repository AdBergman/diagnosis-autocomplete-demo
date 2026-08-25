# React Aria autocomplete with and without a BFF

A small Spring Boot and React reference application. One generic React Aria
autocomplete is used by three thin adapters:

- diagnoses through a direct domain API
- Swedish veterinary clinics through a direct domain API
- veterinary clinics through a server-configured BFF contract

The static catalogues contain 12,000 synthetic diagnoses and 1,000 synthetic
clinics. Clinic organisation numbers use the Swedish `NNNNNN-NNNN` format.

> Synthetic demonstration data. Not for clinical, veterinary, or administrative use.

## Structure

```text
Direct diagnosis adapter ──→ /api/diagnoses ─────────────────┐
Direct clinic adapter ─────→ /api/veterinary-clinics ────────┤
BFF adapter ──→ config ──→ canonical BFF items ──────────────┤
                                                              ↓
                                           AsyncAutocomplete<T, Cursor>
```

`AsyncAutocomplete<T, Cursor>` owns the React Aria behavior, abortable
debouncing, paging, selection, loading, and error states. URLs and domain DTOs
stay in adapters.

The direct adapters map their domain responses. The BFF adapter first receives
only a `heading` and `searchUrl`, then consumes display-ready
`{ id, label, description }` items. Configured search URLs must be relative paths
inside `/api/bff/autocompletes/`.

The BFF is additive: the direct endpoints and adapters are unchanged, and the
generic component has no BFF-specific mode.

## Run

Use Java 25, Node.js 24.19 or newer, and pnpm 11.24.

```bash
cd backend
./mvnw spring-boot:run
```

In another terminal:

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:5173`. Vite proxies relative `/api` requests to Spring on
port 8080.

## API contracts

Direct domain APIs:

```text
GET /api/diagnoses?q=renal&page=0&size=20
GET /api/veterinary-clinics?q=5591001622&page=0&size=20
```

BFF configuration:

```text
GET /api/bff/autocompletes/veterinary-clinics
```

```json
{
  "heading": "Find a veterinary clinic through the BFF",
  "searchUrl": "/api/bff/autocompletes/veterinary-clinics/items"
}
```

BFF results:

```text
GET /api/bff/autocompletes/veterinary-clinics/items?q=5591001622&page=0&size=20
```

```json
{
  "items": [
    {
      "id": "559100-1622",
      "label": "Malmö Park Djursjukhus",
      "description": "559100-1622"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1,
  "hasNext": false
}
```

Search, normalization, ranking, and paging stay in the catalogue layer. The BFF
only projects a page to its presentation contract. Page size defaults to 20 and
is limited to 50; invalid paging returns a Problem Detail response.

## Verify

```bash
cd backend
./mvnw verify
```

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

The browser test exercises direct and BFF flows and runs axe-core. The clinic
fixture can be regenerated with:

```bash
node backend/scripts/generate-veterinary-clinics.mjs
```
