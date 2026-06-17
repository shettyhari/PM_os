---
name: DB schema declarations rebuild
description: Whenever a new file is added to lib/db/src/schema/, the composite TypeScript project must be rebuilt so api-server can see the new exports.
---

**Rule:** After adding a new file to `lib/db/src/schema/` and exporting it from `schema/index.ts`, always run `pnpm --filter @workspace/db exec tsc -p tsconfig.json` before type-checking or building the api-server.

**Why:** The `lib/db` package uses `composite: true` + `emitDeclarationOnly: true`. The api-server resolves the package through project references, which reads from `lib/db/dist/*.d.ts`. If those declarations are stale, tsc reports "Module '@workspace/db' has no exported member '...'" even though the source is correct.

**How to apply:** Any time a new schema table is created, run the DB tsc rebuild as part of the same batch of steps (not after the fact). Then clear `artifacts/api-server/.tsbuildinfo` if needed and verify with `pnpm --filter @workspace/api-server exec tsc --noEmit`.
