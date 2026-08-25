# AGENTS.md

Keep this repository a small reference implementation.

- `backend/` is a Java 25 Spring Boot MVC application. Verify it with `cd backend && ./mvnw verify`.
- `frontend/` is a strict React/TypeScript Vite application. Verify it with `cd frontend && pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- Keep `backend/src/main/resources/diagnoses.json` at exactly 12,000 synthetic entries. Its source order is deliberately unsorted.
- Keep `backend/src/main/resources/veterinary-clinics.json` at exactly 1,000 synthetic entries with unique names and Luhn-valid organisation numbers in `NNNNNN-NNNN` format. Its source order is deliberately unsorted.
- Load both catalogues once, then perform deterministic search, ranking, and paging on the server. Never send a complete catalogue to the browser.
- Keep the frontend on React Aria's real `Autocomplete`, `useAsyncList`, and built-in collection behavior. Do not replace `Autocomplete` with `ComboBox` or recreate its keyboard and ARIA interactions.
- Keep direct and BFF adapters on `frontend/src/components/AsyncAutocomplete.tsx`. URLs, domain DTOs, labels, rendering, and selected-value display belong in thin adapters.
- Keep the BFF contract additive and canonical: configuration contains only `heading` and a relative `searchUrl`, while results contain `id`, `label`, and `description`. Do not turn it into a remote UI schema or allow arbitrary configured URLs.
- Do not add a database, server-state library, UI framework, or architectural layer without a concrete new requirement.
- Keep changes inside the relevant module and preserve the deliberately small end-to-end flow.
