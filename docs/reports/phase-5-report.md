# Phase 5 — implementation report

**Status:** ✅ Done (2026-06-24)
**Scope:** CI/CD, enforcement, and agent evals — machines enforce the standard on
every push.
**Plan:** [implementation-plan.md → Phase 5](../plans/implementation-plan.md)

## Summary

Phase 5 made the standard automatic. A GitHub Actions pipeline runs both
languages' full gates on every push and PR; commit messages, hexagonal import
boundaries, and dependency CVEs are enforced in CI; and an agent eval suite proves
the gate behaves correctly across a golden dataset shared by both languages. It was
verified by running the pipeline on GitHub — every job is green on a clean
checkout — and the eval suite passes 100%.

## Delivered

- **GitHub Actions** (`.github/workflows/ci.yml`) — four jobs:
  - `TypeScript gate` (Node 24): install, typecheck, lint, format check, unit
    coverage, and Redis integration tests (against a `redis:8.8` service).
  - `Python gate` (Python 3.14 via uv): ruff, ruff format check, mypy `--strict`,
    import-linter, pytest (unit + eval), and Redis integration tests.
  - `Commit messages`: commitlint on a PR's commit range.
  - `Dependency scan (SCA)`: Trivy over the lockfiles, failing on HIGH/CRITICAL.
- **Commitlint** — a root `commitlint.config.js` (`@commitlint/config-conventional`),
  a committed `.githooks/commit-msg` hook, and `make hooks` to install it
  (CODING_PRINCIPLES §13).
- **Hexagonal import enforcement** — the Python `import-linter` contracts run in
  CI, and a new ESLint `no-restricted-imports` boundary rule does the same for
  TypeScript (domain depends on nothing; application only on the domain;
  infrastructure must not reach the interface — §9.2).
- **Dependency scanning** — Trivy (`fs`, `--severity HIGH,CRITICAL --exit-code 1
  --ignore-unfixed`) blocks a merge on a Critical/High CVE (§7.10).
- **Agent eval suite** (§10.6) — a language-neutral golden dataset
  (`evals/support-agent/golden-cases.json`, 36 cases, generated deterministically
  by `generate_cases.py`) plus a Python runner (`tests/eval`) and a TypeScript
  runner (`test/eval`). Each asserts the wired agent fires the gate on every
  sensitive tool call and never on a safe one, with the correct execution sequence.
- A CI status badge in the README.

## Verification

- **CI is green on a clean checkout.** The push pipeline ran all real jobs to
  success: TypeScript gate ✓, Python gate ✓, Dependency scan ✓ (commitlint runs on
  PRs). A pull request (#1) then ran all four jobs, including **commitlint ✓**.
- **ESLint boundary rule:** verified positively (the suite stays green) and
  negatively (a probe importing infrastructure from the domain is rejected).
- **Commitlint:** verified locally — a Conventional Commit passes, a bad message is
  rejected — and in CI on the PR.
- **SCA:** Trivy reports 0 HIGH/CRITICAL across `pnpm-lock.yaml` and `uv.lock`.
- **Eval suite:** 36 golden cases, **100% pass** in both runners (Python: 37 tests;
  TypeScript: 37 tests) — well above the ≥ 90% bar.

## CODING_PRINCIPLES adherence

- **§10.6 (agent evals):** a golden dataset (> 30 cases) asserting gate behavior and
  tool sequences, shared across both languages.
- **§13 (Conventional Commits):** commitlint in CI and a local hook.
- **§9.2 (hexagonal imports):** import-linter (Python) and the ESLint boundary rule
  (TypeScript), both in CI.
- **§7.10 (current, safe dependencies):** Trivy SCA blocks HIGH/CRITICAL CVEs.
- **No warnings (§7.6):** the Node 20 deprecation annotation was cleared by moving
  the actions to `@v5`.

## Decisions and notes

- **One golden dataset, two runners.** The eval cases live in a neutral JSON file;
  both the TypeScript and Python runners load the same file, so the suite doubles as
  a cross-language parity check (ADR-0006). Expected results are derived from the
  gate rule, so the eval tests the wired implementation against the simple spec.
- **commitlint runs on PRs**, where the commit range is well-defined; direct pushes
  to `main` are validated when they arrive through a PR.
- **Trivy via its install script** (not a pinned marketplace action) to avoid action
  version drift; `--ignore-unfixed` keeps the gate actionable.

## Commits

- `9456a2b` — ci(ts): enforce hexagonal import boundaries in ESLint
- `e481e51` — test(py): add the support-agent eval suite and shared golden dataset
- `376e57a` — test(ts): add the support-agent eval runner over the shared golden dataset
- `4b8933f` — ci: add commitlint config, commit-msg hook, and a make target
- `778fe57` — ci: add GitHub Actions pipeline for both packages
- `55d66b1` — ci: bump checkout and setup-node to v5 (drop Node 20 deprecation)
- `b9e2373` — docs: add CI status badge to the README (#1)
