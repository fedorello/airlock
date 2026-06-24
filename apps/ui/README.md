# Airlock UI (approver dashboard)

A web dashboard where a human reviews the sensitive actions an Airlock agent wants
to take and **approves**, **edits**, or **rejects** them.

It is, by design, **just another approver adapter**: it speaks the same two events
over Redis (`approval.requested` / `approval.decided`) and reads the run store, so
it touches no Airlock core code. To keep the app independently deployable, the UI
re-declares the small, stable event contract (channel names, key prefix, JSON
shapes — see [`docs/design/contracts.md`](../../docs/design/contracts.md)) rather
than taking a build dependency on the `airlock` package.

> **Status:** scaffolded (phase U0). Built per the
> [UI/UX implementation plan](../../docs/plans/ui-implementation-plan.md).

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript · pino logging ·
Vitest + Testing Library + Playwright. Versions are pinned in `package.json`; the
TypeScript and ESLint versions track what Next 16's toolchain is validated against
(TS 5.9, ESLint 9) to keep the build warning-free.

## Live demo

From the repo root, one command brings up Redis, an agent that raises sensitive
actions, and the dashboard:

```bash
make up-ui        # then open http://localhost:3000
make down         # stop and clean up
```

Approve an action in the UI and the agent resumes and runs it; reject it and it
never runs. To run the pieces locally instead (three terminals): `make ui-agent`,
`make ui-dev`, and a Redis on `AIRLOCK_REDIS_URL`.

## Run it (dev)

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| Command                       | What it does                                   |
| ----------------------------- | ---------------------------------------------- |
| `pnpm typecheck`              | `tsc --noEmit`                                 |
| `pnpm lint`                   | ESLint (Next core-web-vitals + TypeScript)     |
| `pnpm fmt` / `pnpm fmt:check` | Prettier (+ Tailwind class sorting)            |
| `pnpm test` / `pnpm test:cov` | Vitest unit + component tests (coverage ≥ 90%) |
| `pnpm test:e2e`               | Playwright end-to-end (added in phase U5)      |
| `pnpm build`                  | production build                               |

## Structure

```
src/
  app/        # Next.js App Router: layout, pages, and (later) Route Handlers
  core/       # injectable cross-cutting ports: Settings, Logger, Clock
  shared/     # ui/ (presentational primitives) + lib/ (helpers)
  features/   # self-contained feature modules (the approvals queue, U1+)
```

See the [UI/UX implementation plan](../../docs/plans/ui-implementation-plan.md) for
the full design, screens, API, and phases.
