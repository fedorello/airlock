# Contributing

Airlock is a demonstration project, but it holds itself to a production standard
([`CODING_PRINCIPLES.md`](./CODING_PRINCIPLES.md)). If you work in it, keep the
following.

## Before you push

Run the full gate for each language you touched — CI runs the same checks:

```bash
make ts-check     # TypeScript: typecheck, lint, format, unit + eval tests
make py-check     # Python: ruff, mypy --strict, import-linter, pytest
make check-all    # both
```

Integration tests (`make ts-test-integration`, `make py-test-integration`) need a
Redis on `AIRLOCK_REDIS_URL`.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
(enforced by commitlint in CI and a local hook). Install the hook once:

```bash
make hooks
```

Use a type (`feat`, `fix`, `docs`, `test`, `ci`, `build`, `refactor`, `chore`)
and, where it helps, a scope — e.g. `feat(py): add the OpenAI provider`.

## Architecture rules

Imports point inward (hexagonal): the domain depends on nothing, the application
only on the domain, and infrastructure must not reach the interface. This is
enforced by ESLint (TypeScript) and import-linter (Python), so a violation fails
the gate.

## Versioning and releases

- The two packages share one version and move in **lockstep**, following
  [Semantic Versioning](https://semver.org/).
- To cut a release: bump the version in `packages/ts/package.json` and
  `packages/py/pyproject.toml`, move the
  [`CHANGELOG.md`](./CHANGELOG.md) `Unreleased` entries under the new version with
  the date, and tag `vX.Y.Z`.
- Record every notable change under `Unreleased` in the changelog as you go
  ([Keep a Changelog](https://keepachangelog.com/)).
