# AGENTS.md

Keep this repository a small reference implementation.

- `backend/` is a Java 25 Spring Boot MVC application. Verify it with `cd backend && ./mvnw verify`.
- `frontend/` is a strict React/TypeScript Vite application. Verify it with `cd frontend && pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- Keep `backend/src/main/resources/diagnoses.json` at exactly 12,000 synthetic entries. Its source order is deliberately unsorted.
- Load the catalogue once, then perform deterministic search, ranking, and paging on the server. Never send all diagnoses to the browser.
- Keep the frontend on React Aria's real `Autocomplete`, `useAsyncList`, and built-in collection behavior. Do not replace `Autocomplete` with `ComboBox` or recreate its keyboard and ARIA interactions.
- Do not add a database, server-state library, UI framework, or architectural layer without a concrete new requirement.
- Keep changes inside the relevant module and preserve the deliberately small end-to-end flow.
