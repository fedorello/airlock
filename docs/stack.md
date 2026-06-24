# Technology stack and pinned versions

The exact stack Airlock is built on. Versions here are **current stable** as
verified on **2026-06-24** against the npm registry, PyPI, and the official
release channels for the runtimes. Treat this file as the source of truth; the
package manifests and lockfiles must agree with it.

## Versioning policy

- **Recent but stable.** We pin to the latest stable release of each dependency,
  never a pre-release, alpha, beta, or release candidate.
- **Runtimes track LTS.** Node.js uses the Active LTS line; Python uses the
  latest stable; Redis uses the latest stable server.
- **Exact reproducibility.** Manifests use caret ranges anchored to the versions
  below; the lockfiles (`pnpm-lock.yaml`, `uv.lock`) pin exact versions so every
  install is reproducible.
- **One source of truth.** When a version changes, update this file in the same
  commit as the manifest change.

---

## Runtimes

| Runtime | Pinned | Notes |
| --- | --- | --- |
| **Node.js** | **24 LTS** (24.18.0) | Active LTS through Oct 2026, then Maintenance LTS to Apr 2028. `engines` requires `>=24`. |
| **Python** | **3.14** (3.14.6) | Latest stable. Minimum supported: `>=3.13`. |
| **Redis** | **8.8** (server, 8.8.0) | Used for the event bus (Pub/Sub) and the run store. |

---

## TypeScript package (`packages/ts`)

Package manager: **pnpm 11.9.0**.

| Dependency | Version | Purpose |
| --- | --- | --- |
| `typescript` | 6.0.3 | Language / compiler. |
| `tsup` | 8.5.1 | Build (bundle to ESM + types). |
| `vitest` | 4.1.9 | Test runner. |
| `@vitest/coverage-v8` | 4.1.9 | Coverage. |
| `zod` | 4.4.3 | Schemas and runtime validation for config and provider responses. |
| `ioredis` | 5.11.1 | Redis client — Pub/Sub event-bus adapter and Redis run-store adapter. |
| `eslint` | 10.5.0 | Linting. |
| `typescript-eslint` | 8.62.0 | TypeScript lint rules / parser. |
| `prettier` | 3.8.4 | Formatting. |
| `tsx` | 4.22.4 | Run the TypeScript examples / demos directly (no build step). |
| `@types/node` | 24.13.2 | Node typings — pinned to the Node 24 LTS major. |

The ESLint config also carries a hexagonal import-boundary rule
(`no-restricted-imports`) that fails the lint step on an inward-pointing
violation.

---

## Python package (`packages/py`)

Package / environment manager: **uv 0.11.8**. Build backend: **hatchling 1.30.1**.

| Dependency | Version | Purpose |
| --- | --- | --- |
| `pydantic` | 2.13.4 | Schemas and validation for tool inputs, events, and run state. |
| `pydantic-settings` | 2.14.2 | Typed configuration from environment variables (`Settings`). |
| `redis` | 8.0.1 | redis-py (async) — Pub/Sub event-bus adapter and Redis run-store adapter. |
| `httpx` | 0.28.1 | Async HTTP client for the provider adapters (no vendor SDKs; ADR-0007). |
| `pytest` | 9.1.1 | Test runner. |
| `pytest-asyncio` | 1.4.0 | Async test support. |
| `pytest-cov` | 7.1.0 | Coverage. |
| `ruff` | 0.15.19 | Linting and formatting. |
| `mypy` | 2.1.0 | Static type checking. |
| `import-linter` | 2.12 | Enforce the hexagonal import boundaries (CI). |

---

## Container images

Used by Docker Compose (see the deployment topology in
[`architecture/overview.md`](./architecture/overview.md)).

| Image | Tag | Use |
| --- | --- | --- |
| `node` | `24-alpine` | TypeScript demo service. |
| `ghcr.io/astral-sh/uv` | `python3.14-bookworm-slim` | Python demo service (uv + Python 3.14). |
| `redis` | `8.8-alpine` | Event bus (Pub/Sub) and run store. |

Compose uses the Compose Specification (Docker Compose v2, shipped with Docker
Engine).

---

## How the stack maps to the architecture

Every dependency exists to back a specific port or adapter — nothing is in the
core. See [`architecture/overview.md`](./architecture/overview.md).

- **`EventBus` port** → `ioredis` (TS) / `redis` (Python) Pub/Sub adapter; an
  in-memory adapter has no dependencies.
- **`RunStore` port** → the same Redis client for the Redis adapter; in-memory
  adapter has none.
- **`LlmProvider` port** → the Anthropic and OpenAI adapters call the vendors'
  HTTP APIs directly over an injected `fetch` (TS) / `httpx` client (Python) — no
  vendor SDKs (see ADR-0007) — validating responses with `zod` / `pydantic`; the
  `Fake` adapter has no dependencies.
- **Domain schemas / validation** → `zod` (TS) / `pydantic` (Python).
- **Tests** → `vitest` / `pytest`, run entirely against the `Fake` provider and
  the in-memory bus and store — no network, no Redis, no API keys.

---

## CI and supply chain

GitHub Actions runs both packages' full gates on every push and PR.
**commitlint** (`@commitlint/config-conventional`) enforces Conventional Commits;
hexagonal imports are enforced by the ESLint boundary rule and `import-linter`;
and **Trivy** scans the lockfiles, failing the build on a HIGH/CRITICAL CVE
(CODING_PRINCIPLES §7.10).

---

## Maintenance

Re-verify these versions before any dependency bump, and bump deliberately (not
automatically). The verification used the npm registry (`npm view <pkg>
version`), PyPI (`pypi.org/pypi/<pkg>/json`), and the official Node.js, Python,
and Redis release pages, on 2026-06-24.
