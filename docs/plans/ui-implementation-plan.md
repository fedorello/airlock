# Airlock — UI/UX implementation plan

A web **approver dashboard**: a clean, modern UI where a human sees the sensitive
actions an agent wants to take and **approves / edits / rejects** them. It lives in
`apps/ui` as a Next.js app and is, by design, **just another approver adapter** —
it touches no Airlock core code; it only speaks the same two events over Redis and
reads the run store. Proving that decoupling is half the point of building it.

## Status snapshot

| Phase | Scope | Status |
| --- | --- | --- |
| U0 | Scaffold: Next.js + Tailwind v4 + shadcn, theme, gates | ✅ Done |
| U1 | Redis bridge + API (list pending, decide, live stream) | ✅ Done |
| U2 | Approvals dashboard: cards, badges, approve / reject | ✅ Done |
| U3 | Edit flow, reject-with-reason, run detail / audit timeline | ✅ Done |
| U4 | Polish: empty states, toasts, motion, dark mode, a11y, responsive | ✅ Done |
| U5 | Seed/demo, Docker + Compose, tests, CI, README | ⬜ Next |

Done when: from a clean checkout, `make up-ui` brings up Redis + the agent demo +
the UI; a pending approval appears live; clicking **Approve** resumes the run and
the action executes; **Reject** blocks it; **Edit** changes the arguments. Gates
(typecheck / lint / format / tests) green, in CI.

---

## 1. Where it fits (architecture)

Airlock's approval flow is two events over Redis Pub/Sub plus a durable run store.
The UI plugs into exactly those, reusing the existing `airlock` TypeScript package —
no new core code, no parallel logic.

```
            approval.requested (event)            ┌─────────────────────┐
  Agent ───────────────────────────────────────▶ │  Next.js UI (apps/ui)│
  (runner)                                        │  - reads pending     │
     ▲                                            │    runs from store   │
     │            approval.decided (event)        │  - shows the queue   │
     └──────────────────────────────────────────  │  - publishes the     │
                                                   │    human's decision  │
   RedisRunStore (airlock:run:*)  ◀── reads ────── └─────────────────────┘
```

- **The pending queue is durable.** On load, the API scans `airlock:run:*` and keeps
  the runs whose `status == awaiting_approval` — so the queue survives a UI restart
  and never misses an item (events alone are ephemeral).
- **Live updates** come from subscribing to `approval.requested` and `run.completed`
  and streaming them to the browser over **SSE** (Server-Sent Events).
- **A decision** (approve / edit / reject) is a `POST` that publishes
  `approval.decided`; the Airlock runner picks it up and resumes the run.
- The API routes `import { RedisEventBus, RedisRunStore, EventTopic, ApprovalDecidedEvent, parseApprovalRequested } from "airlock"` — the UI is a thin presentation layer over the library.

**Runtime note:** Redis Pub/Sub and SSE need the **Node.js runtime** (not Edge), so
the relevant Route Handlers set `export const runtime = "nodejs"`.

---

## 2. Stack and pinned versions

Verified against the npm registry on 2026-06-24 (CODING_PRINCIPLES §7.10). Package
manager **pnpm 11.9.0**, runtime **Node 24** (to match the rest of the monorepo).

| Package | Version | Purpose |
| --- | --- | --- |
| `next` | 16.2.9 | App Router framework (RSC + Route Handlers). |
| `react` / `react-dom` | 19.2.7 | UI runtime. |
| `tailwindcss` + `@tailwindcss/postcss` | 4.3.1 | Styling (Tailwind v4 engine). |
| `typescript` | 5.9.3 | Language (tracks Next 16's validated toolchain). |
| `@types/node` | 24.13.2 | Node 24 typings (matches the runtime, not the newest 26.x). |
| `@types/react` | 19.2.17 | React typings. |
| `@types/react-dom` | 19.2.3 | React DOM typings. |
| `eslint` | 9.39.4 | Linting (tracks `eslint-config-next`). |
| `eslint-config-next` | 16.2.9 | Next.js lint rules. |
| `prettier` | 3.8.4 | Formatting. |
| `prettier-plugin-tailwindcss` | 0.8.0 | Sort Tailwind classes. |
| `lucide-react` | 1.21.0 | Icons. |
| `clsx` | 2.1.1 | Conditional class names. |
| `tailwind-merge` | 3.6.0 | Merge Tailwind classes safely. |
| `class-variance-authority` | 0.7.1 | Component variants (shadcn). |
| `zod` | 4.4.3 | Validate API request bodies (matches `packages/ts`). |
| `ioredis` | 5.11.1 | Redis bridge in the API routes (matches `packages/ts`). |
| `airlock` (workspace) | 0.1.0 | Reuse event topics, schemas, `RedisEventBus` / `RedisRunStore`. |
| `@tanstack/react-query` | 5.101.1 | _Optional_: data fetching / cache for the queue. |

**Components:** [shadcn/ui](https://ui.shadcn.com/) (CLI-generated, accessible
components on Radix UI primitives + Tailwind). Each component pulls its own
`@radix-ui/*` dependency via the CLI, so those are not pinned here individually.

---

## 3. UX specification

**Design language:** calm, modern, trustworthy — this screen decides whether real
money moves. Dark mode by default with a light toggle. Generous spacing, clear
hierarchy, no clutter. The font is Geist (ships with Next).

**Risk is the visual anchor:**

- **Safe** → muted / neutral (rarely shown; safe actions don't stop here).
- **Sensitive (pending)** → amber accent + a "Needs approval" badge.
- **Approved** → green; **Rejected** → red; **Completed** → muted check.

### Screens

1. **Approvals dashboard (home).** A live queue of pending sensitive actions. Empty
   state: _"No actions waiting — your agents are behaving."_ A header shows the
   live-connection status (Redis connected) and a count of pending items.

2. **Approval card** — the heart of the UI. Each pending action shows:
   - Risk badge + tool name, and a **human summary** ("Issue refund — **$49.99** on
     order `ord-42`").
   - The **arguments**, pretty-printed (and editable in the edit flow).
   - **Run context**: the user's original request and a collapsible **audit
     timeline** (model calls, tool runs, prior approvals) read from the store.
   - "Waiting for 2m" timer.
   - Actions: **Approve** (primary, green), **Edit & approve** (opens an editor),
     **Reject** (red, opens a reason field).

3. **Run detail** (drawer or page): the full audit trail of one run — every model
   call, tool execution, and decision, in order, with timestamps.

4. **History** (optional, U4+): recently approved / rejected / completed runs.

### Interaction details

- A new pending approval **slides in** at the top of the queue in real time.
- Approving/rejecting **optimistically** removes the card and shows a toast; on
  failure it reappears with an error.
- **Edit & approve** opens a dialog with a structured/JSON editor of the arguments,
  validated before submit; the edited args are what execute.
- **Reject** requires a short reason (stored in the decision and the audit trail).
- Full keyboard access and ARIA (shadcn/Radix give this for free); visible focus.

---

## 4. API design (Route Handlers, Node runtime)

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/approvals` | `GET` | List pending runs (scan `airlock:run:*`, keep `awaiting_approval`). |
| `/api/approvals/[runId]/decision` | `POST` | Body `{ type, approver, editedArgs?, reason? }` → zod-validate → publish `approval.decided`. |
| `/api/runs/[runId]` | `GET` | Full run + audit timeline (from the store). |
| `/api/stream` | `GET` | SSE: push `approval.requested` and `run.completed` as they happen. |

A single server-only `lib/redis.ts` owns the ioredis connections (publisher,
subscriber, store) and reuses Airlock's `EventTopic`, event schemas, `RedisEventBus`,
and `RedisRunStore`. Decisions are validated with `zod` (shared decision shape) before
publishing, so a malformed request can never reach the bus.

---

## 5. Phases

### U0 — Scaffold
- `apps/ui` Next.js (App Router, TypeScript, `src/`), Tailwind v4 via
  `@tailwindcss/postcss`, shadcn initialized, the pinned versions, ESLint + Prettier
  (+ tailwind plugin). Base layout, theme tokens (light/dark), Geist font.
- **DoD:** `pnpm typecheck && pnpm lint && pnpm build` green; a styled placeholder
  page renders.

### U1 — Redis bridge + API
- `lib/redis.ts` using the `airlock` package; the four routes above; SSE stream.
- **DoD:** `GET /api/approvals` returns the live pending list against a real Redis;
  a decision `POST` resumes a suspended run (verified end to end).

### U2 — Dashboard
- The queue + approval cards (risk badge, human summary, args, approve/reject),
  wired to the API, with live SSE updates and optimistic actions.
- **DoD:** a suspended run appears live; Approve resumes it; Reject blocks it.

### U3 — Edit, reject reason, run detail
- The args editor dialog (edit & approve), the reject-reason field, and the run
  detail / audit timeline view.
- **DoD:** editing the amount changes what executes; rejecting records the reason.

### U4 — Polish
- Empty/loading/error states, toasts, subtle motion, dark-mode toggle, responsive
  (works on a phone), accessibility pass.
- **DoD:** Lighthouse a11y ≥ 95; usable on mobile; no layout shift.

### U5 — Demo, Docker, tests, CI
- A seed command that starts a suspended run so the queue isn't empty
  (`make ui-seed`); a `Dockerfile` + a `ui` service in `docker-compose`
  (`make up-ui`); component tests (Vitest + React Testing Library) and one
  end-to-end click-through (Playwright); add the UI gate to CI.
- **DoD:** `make up-ui` shows a working dashboard against the live demo; gates green
  in CI.

---

## 6. Testing

- **Components:** Vitest + React Testing Library — the approval card renders each
  state; actions call the API; the edit dialog validates.
- **API routes:** tested against a real Redis (reuse the Airlock integration
  pattern), plus the in-memory fakes for pure logic.
- **End to end:** Playwright — start a suspended run, see it appear, approve it,
  assert it disappears and the run completes.
- All deterministic where possible; no real model or API keys (the agent uses the
  fake provider, as in the existing demos).

## 7. Deployment

- A multi-stage `Dockerfile` (build → standalone Next server) under `deploy/docker/`.
- A `ui` service added to `deploy/docker/docker-compose.yml`, depending on `redis`,
  alongside a runner that keeps an agent alive to produce approvals.
- Makefile: `make ui-dev` (local dev server), `make up-ui` (full stack via Compose),
  `make ui-check` (the UI gate).

## 8. Out of scope (v1)

Kept out to stay focused (each can be a later increment):

- **Auth / SSO and multi-tenant approver routing.** v1 takes the approver's name in a
  field; it is a demo, not a hosted product.
- **Persistence beyond Redis** (a history database). The store + audit cover the MVP.
- **A native mobile app.** The web UI is responsive instead.
- **Rich policy editing in the UI** (changing risk tiers / gate policy at runtime).
