# Documentation

All project documentation lives here, organized by purpose. Keep it tidy: every
document belongs in a clearly named subfolder.

## Layout

- **`adr/`** — Architecture Decision Records. One file per decision, numbered and
  immutable once accepted. Naming: `NNNN-kebab-case-title.md` (e.g.
  `0001-architecture-foundations.md`). Each ADR uses the sections: Status,
  Context, Decision, Consequences.
- **`architecture/`** — Living architecture overview: the hexagon, ports and
  adapters, the event flow, and diagrams. Describes the system as it is now.
- **`design/`** — Design specs for features and packages (e.g. the shared
  TypeScript/Python agent-loop and approval-gate spec).
- **`plans/`** — Implementation plans: the phased roadmap for building the
  project, with a status snapshot.

## Conventions

- English only.
- A new significant decision → a new ADR (don't edit an accepted one; supersede
  it with a new ADR and mark the old one `Superseded`).
- When you add a document, add it to the index in [`CLAUDE.md`](../CLAUDE.md).

## Index

See the **Documentation index** in [`CLAUDE.md`](../CLAUDE.md) for the full list
of documents.
