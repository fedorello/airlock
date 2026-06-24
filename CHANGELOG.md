# Changelog

All notable changes to Airlock are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/). The TypeScript and Python packages
share this changelog and version in lockstep.

## [Unreleased]

## [0.1.0] - 2026-06-24

The first complete, tested release: the agent loop with the approval gate, in both
TypeScript and Python, with providers, Redis adapters, a runnable example, CI, and
an eval suite.

### Added

- **Core** — the `Agent` tool-use loop with the human-approval gate: safe tools run
  automatically; sensitive tools pause for approve / edit / reject. Resumable runs
  and a full audit trail. (TypeScript and Python, mirrored one-to-one.)
- **Providers** — Anthropic and OpenAI-compatible adapters over an injected HTTP
  client, with no vendor SDKs.
- **Infrastructure** — a Redis run store and Pub/Sub event bus; in-memory fakes;
  JSONL audit sinks; typed settings.
- **Interface** — the agent runner and the approver (auto-approve and an
  interactive CLI).
- **Example** — the support-agent demo (in-memory and over Redis), with Docker
  Compose and a Makefile.
- **CI** — GitHub Actions running both languages' full gates, commitlint, hexagonal
  import enforcement (ESLint + import-linter), and a Trivy dependency scan.
- **Evals** — a shared golden dataset (36 cases) asserting the gate fires on every
  sensitive action and never on a safe one, run by both languages.

[Unreleased]: https://github.com/fedorello/airlock/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/fedorello/airlock/releases/tag/v0.1.0
