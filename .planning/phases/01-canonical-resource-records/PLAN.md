# Phase 1: Canonical resource records

## Goal

Make each of the current 514 catalogue resources a stable, permanently identified record maintained in one canonical data location. Preserve current generated outputs and editorial/evidence semantics so the migration is operationally reversible and does not silently change compatibility claims.

## Scope

In scope:

- A stable ID for every current resource, independent of its URL.
- One canonical record format under `data/resources/`.
- Canonical URL plus previous URLs/aliases for renamed or moved providers.
- Explicit `category`, `kind`/format, and `tasks` fields; retain current category behavior as the compatibility fallback.
- A migration/import generator from the current CSV, Markdown, versions, details, tags, discovery ledgers, and provider history.
- Validation for schema, ID uniqueness, URL uniqueness/aliases, evidence, references, and generated-output parity.
- Updates to documentation and contributor workflow.

Out of scope:

- Re-researching or changing compatibility, access, pricing, version, or evidence facts.
- Reclassifying every resource's taxonomy by editorial judgment beyond deterministic migration defaults and a review ledger.
- Search ranking, comparison UI, individual pages, payload splitting, API/feed, scheduled monitoring, or deployment changes.
- Publishing reports, raw research, or private source data.

## Decisions

1. Use a readable slug-like permanent ID (`resolve-mcp`, `cineprint35`) with lowercase ASCII, digits, and hyphens; reserve suffixes for collisions rather than deriving IDs from URLs.
2. Keep `urls.canonical` as the current public URL and `urls.previous` as an append-only alias list. Alias URLs identify the same record and cannot be reused by another record.
3. Keep evidence field names and levels unchanged in Phase 1. The canonical record stores existing evidence verbatim; coverage scoring belongs to a later phase.
4. Treat `kind` as a controlled format/type dimension separate from broad `category`. Start with: `dctl`, `ofx`, `powergrade`, `fuse`, `fusion-macro`, `reactor-package`, `lut`, `resolve-script`, `mcp-server`, `workflow-app`, `subtitle-tool`, `template`, `encoder`, `control-surface`, `reference`, `collection`, `other`.
5. When migration cannot determine `kind`, write `other` plus a review marker; never infer a stronger compatibility or licensing claim from a file extension, language, or category name alone.
6. Keep legacy source files as read-only compatibility inputs for one release cycle, then remove only after parity has been proven and a separate cleanup decision is approved.

## Deliverables

- `data/resources/*.json`: one canonical record per resource.
- `data/resources/index.json`: deterministic ID/name/URL index and schema version.
- `data/resource-id-map.json`: migration audit mapping old URL-derived IDs and URLs to permanent IDs, including manual decisions and aliases.
- `scripts/migrate-resources.mjs`: idempotent migration from current maintained inputs; refuses duplicate IDs, duplicate canonical URLs, collisions, missing data, or unsafe URL changes.
- `scripts/resource-schema.mjs`: shared parsing, normalization, validation, and controlled-vocabulary helpers.
- Updated `scripts/build-site.mjs` and `scripts/build-catalogue.mjs` to consume canonical records while retaining current output shapes where possible.
- Tests for migration parity, stable IDs, alias behavior, taxonomy validation, and deterministic generation.
- Updated `CATALOGUE-GUIDE.md`, `CONTRIBUTING.md`, and `WEBSITE.md`.

## Implementation sequence

### 1. Baseline and golden outputs

- Record the current clean state and run the existing Node 22 test suite.
- Save checksums or normalized snapshots of `README.md`, `TOOL-FINDER.md`, `CHANGELOG.md`, `views/*.md`, and `site/catalogue.json` for semantic comparison.
- Add a parity helper comparing resource identity, descriptions, access, platforms, requirements, versions, tags, evidence, history, and counts.

Verification: baseline passes; no unrelated changes; URLs and counts are unique.

### 2. Define and validate the canonical schema

- Implement schema helpers without npm dependencies.
- Require `id`, `name`, `creator`, `urls.canonical`, `origin`, `category`, `kind`, `tasks`, `description`, `access`, and existing structured metadata blocks.
- Preserve current field names inside `requirements`, `version`, `evidence`, and `history` unless an adapter is required.
- Validate dates, HTTPS sources, controlled values, nonempty tags, and cross-record ID/URL uniqueness.
- Define stable serialization order.

Verification: malformed IDs, duplicate aliases, unsupported kinds, non-HTTPS evidence, invalid dates, and missing blocks fail with actionable errors.

### 3. Build migration and initial records

- Read current CSV and external Markdown through existing parsers.
- Join versions, details, search tags, provider history, and discovery metadata by canonical URL.
- Generate permanent IDs from normalized names, with deterministic collision handling and an explicit map for exceptional names.
- Copy the current URL into `urls.canonical`; initialize `urls.previous` empty unless an existing source documents a rename.
- Assign `kind` conservatively; use `other` and a review marker when confidence is insufficient.
- Preserve current facts exactly and never promote inferred taxonomy to evidence.
- Make reruns identical and refuse to overwrite a changed ID map without explicit migration mode.

Verification: all 514 resources migrate; every old URL resolves to one permanent ID; no supporting record is orphaned; migration is idempotent.

### 4. Switch generators to canonical records

- Update site and catalogue builders to load `data/resources/index.json` and records rather than independently joining maintained files.
- Keep the current public `site/catalogue.json` entry shape; use URL-based compatibility adapters only where existing consumers require them.
- Emit IDs from canonical records, never hashes.
- Preserve ordering, official-first behavior, access labels, platform notes, version labels, history, and local-link rules.
- Ensure legacy inputs are not rewritten by normal builds.

Verification: all 514 resource semantics match baseline; filters and history remain functional; no private paths appear; `git diff --check` passes.

### 5. Tests and documentation

- Replace URL-only assumptions with canonical-ID-aware tests while retaining alias coverage.
- Add a URL-rename regression test proving ID and history remain unchanged.
- Add fail-closed tests for duplicate aliases and changed ID maps.
- Document canonical editing, migration, taxonomy vocabulary, evidence boundaries, and legacy-input deprecation.

Verification: `node --test --test-concurrency=1 scripts/*.test.mjs` passes after regeneration.

### 6. Review and handoff

- Inspect the full diff for accidental factual changes and generated churn.
- Review every `kind: other` record and collision suffix.
- Confirm research/report paths remain ignored and absent from outputs.
- Do not create a catalogue release for this maintenance migration unless a separate verified provider update is included.

## Acceptance criteria

- Every current resource has one stable permanent ID independent of its current URL.
- Canonical URLs and previous aliases resolve without duplication.
- Records separate category, kind/format, and tasks.
- Compatibility, access, version, tags, evidence, history, counts, and browsing behavior are preserved.
- Generation is deterministic and zero-dependency under Node.js 22+.
- Validation fails closed on collisions, orphaned data, invalid sources, malformed records, and unsafe ID-map changes.
- Reverting to the legacy adapter remains possible; no legacy source is deleted in this phase.
- Full tests and diff checks pass, with no private research/report data published.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| URL changes break history or links | Permanent ID map, append-only aliases, and rename regression test |
| Migration silently alters facts | Baseline semantic parity and verbatim metadata preservation |
| Taxonomy guesses become compatibility claims | Conservative `other` fallback, review markers, and documentation |
| Two sources remain authoritative | Builders consume canonical records; legacy parsers are migration-only |
| Large generated diff hides mistakes | Semantic comparison, deterministic serialization, and manual review |

## Completion commands

```powershell
node scripts/migrate-resources.mjs --check
node scripts/build-catalogue.mjs
node scripts/build-site.mjs
node --test --test-concurrency=1 scripts/*.test.mjs
git diff --check
```
