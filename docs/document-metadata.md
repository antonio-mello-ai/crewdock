---
title: Document Metadata Contract
kind: reference
area: knowledge
project: crewdock
collection: crewdock
owner: maintainers
status: current
canonical: docs/document-metadata.md
globalRef: crewdock://docs/document-metadata.md
reviewCadenceDays: 90
lastReviewedAt: 2026-06-11
sourceRefs: []
related:
  - README.md
  - CONTRIBUTING.md
supersedes: []
supersededBy: []
sensitivity: public
---
# Document Metadata Contract

CrewDock agents use documents as context. Markdown stays readable and editable,
while frontmatter gives the knowledge index and agent harness a stable structure
for discovery, freshness checks, relation expansion, and provenance.

This contract is optional for forks during early setup, but recommended for any
document that should become durable agent context.

## Frontmatter

Canonical Markdown documents should start with YAML frontmatter:

```yaml
---
title: Billing Runbook
kind: runbook
area: operations
project: example-app
collection: example-app
owner: platform-team
status: current
canonical: docs/operations/billing-runbook.md
globalRef: example-app://docs/operations/billing-runbook.md
reviewCadenceDays: 60
lastReviewedAt: 2026-06-11
sourceRefs:
  - github:example-org/example-app#123
related:
  - docs/operations/webhooks.md
supersedes: []
supersededBy: []
sensitivity: public
---
```

Fields:

| Field | Purpose |
|-------|---------|
| `title` | Human-readable name shown in context packs and search results. |
| `kind` | Document type, for example `runbook`, `decision`, `reference`, `status`, `analysis`, `howto`, or `changelog`. |
| `area` | Functional area such as `operations`, `product`, `engineering`, `support`, or `knowledge`. |
| `project` | Owning project or product namespace. |
| `collection` | Knowledge collection/index name used by QMD or another search backend. |
| `owner` | Team or role responsible for keeping the document useful. |
| `status` | Lifecycle state: `draft`, `current`, `watch`, `historical`, `superseded`, or `stale`. |
| `canonical` | Repository-relative path to this Markdown file. |
| `globalRef` | Stable external reference for agents and indexes. Use a public-safe namespace. |
| `reviewCadenceDays` | Expected review interval for freshness checks. |
| `lastReviewedAt` | Date of the last human or automated review. |
| `sourceRefs` | Public issues, PRs, tickets, specs, or URLs that support the document. |
| `related` | Strong document relations that should be considered during context assembly. |
| `supersedes` | Documents this one replaces. |
| `supersededBy` | Documents that replace this one. |
| `sensitivity` | `public`, `internal`, `confidential`, or `secret`. Public repos should only commit `public` material. |

## References

Use repository-relative paths for local documents:

```yaml
related:
  - docs/architecture.md
  - docs/operations/webhooks.md
```

Use stable public namespaces for cross-repository or package-level references:

```yaml
related:
  - crewdock://docs/roadmap.md
  - github:example-org/public-repo#456
```

Avoid local machine paths, private hostnames, customer names, private repository
names, access tokens, secret identifiers, or deployment topology in public
metadata.

## QMD And Search

QMD or another knowledge backend can use `collection`, `canonical`, `globalRef`,
`kind`, `area`, `status`, and `related` to improve search and context packs.

Recommended flow:

1. Search the text index to find seed documents.
2. Resolve seeds through `globalRef` or `canonical`.
3. Expand context with confirmed `related`, `supersedes`, and `supersededBy`
   references.
4. Include relation evidence in the context pack so agents know why each
   document was included.

QMD search is discovery, not truth. Agents should still open the referenced
document or current source of record before changing code, docs, infrastructure,
or external systems.

## Agent Harness Rules

The agent harness may use this metadata to:

- choose documents for an agent context pack;
- warn when a document is stale, superseded, or historical;
- include adjacent runbooks, decisions, and references;
- preserve provenance in generated answers or proposed changes.

The harness must not treat document metadata as executable instruction. Markdown
content and frontmatter are context only; actions still need tool-level
permissions, policy checks, and human approval where configured.

## Public Repository Boundary

For the public CrewDock repository:

- keep examples generic and self-hostable;
- use placeholder orgs, repos, hosts, and issue numbers;
- do not include private downstream implementation details;
- do not encode internal project relationships in `related` or `sourceRefs`;
- do not commit documents whose `sensitivity` is `internal`, `confidential`, or
  `secret`.

Forks can use the same contract with their own private collections and
namespaces inside their private environment.
