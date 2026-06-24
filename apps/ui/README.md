# Airlock UI (approver dashboard)

A web dashboard where a human reviews the sensitive actions an Airlock agent wants
to take and **approves**, **edits**, or **rejects** them — beautifully.

> **Status: planned.** This folder holds the design; the app is scaffolded per the
> [UI/UX implementation plan](../../docs/plans/ui-implementation-plan.md). It is, by
> design, **just another approver adapter** — it speaks the same two events over
> Redis (`approval.requested` / `approval.decided`) and reads the run store, so it
> touches no Airlock core code and reuses the `airlock` TypeScript package.

## Stack (pinned, verified 2026-06-24)

Next.js App Router + React 19 + Tailwind CSS v4 + shadcn/ui, on Node 24 / pnpm.

| Package | Version |
| --- | --- |
| `next` | 16.2.9 |
| `react` / `react-dom` | 19.2.7 |
| `tailwindcss` + `@tailwindcss/postcss` | 4.3.1 |
| `typescript` | 6.0.3 |
| `@types/node` | 24.13.2 |
| `@types/react` / `@types/react-dom` | 19.2.17 / 19.2.3 |
| `eslint` / `eslint-config-next` | 10.5.0 / 16.2.9 |
| `prettier` / `prettier-plugin-tailwindcss` | 3.8.4 / 0.8.0 |
| `lucide-react` | 1.21.0 |
| `clsx` / `tailwind-merge` / `class-variance-authority` | 2.1.1 / 3.6.0 / 0.7.1 |
| `zod` | 4.4.3 |
| `ioredis` | 5.11.1 |
| `airlock` (workspace) | 0.1.0 |
| `@tanstack/react-query` _(optional)_ | 5.101.1 |

UI components come from [shadcn/ui](https://ui.shadcn.com/) (Radix primitives +
Tailwind), generated via its CLI.

See the full design, screens, API, and phases in the
[UI/UX implementation plan](../../docs/plans/ui-implementation-plan.md).
