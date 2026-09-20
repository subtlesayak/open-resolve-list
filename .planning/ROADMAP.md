# Subtle Resolve List roadmap

## Phase 1 — Canonical resource records

Replace URL-derived identity and scattered maintained metadata with permanent-ID resource records, while preserving the current README, views, site JSON contract, evidence rules, and zero-dependency workflow.

## Later phases

- Phase 2 — Evidence coverage UI and relevance-ranked search
- Phase 3 — Individual resource pages and comparison URLs
- Phase 4 — Split catalogue payload and machine-readable API/feed
- Phase 5 — Scheduled maintenance candidates and validated deployment
- Phase 6 — Submission tooling, browser/a11y CI, and README reduction

## Current implementation status

Percentages measure implementation against the improvement list, not publication status.

| Phase | Scope | Status | Progress | Remaining |
| --- | --- | --- | ---: | --- |
| 1 | Canonical schema, permanent IDs, taxonomy foundation | Implemented and committed; 34 mappings plus 43 explicit retain-other decisions | 100% | Revisit only when stronger upstream format evidence appears |
| 2 | Evidence coverage and relevance search | Implemented and verified in the local browser smoke | 100% | External hosted UAT only |
| 3 | Resource pages and comparison | Dynamic/static resource pages, structured metadata, sitemap, and similar-resource comparison implemented and browser-verified | 100% of local-safe scope | External hosted UAT only |
| 4 | Split payload, static API, RSS | Implemented and served through the live site | 100% | Consumer-specific integration remains optional |
| 5 | Maintenance monitoring and deployment | Weekly aggregate maintenance workflow and path-triggered validated Pages deployment implemented | 100% | First scheduled run and hosted workflow execution remain operational follow-up |
| 6 | Submission tooling, browser/a11y CI, README reduction | Interactive draft tooling, local structural a11y checks, concise README, loopback preview, HTTP smoke, real Chrome browser smoke, and hosted Chromium/a11y workflow implemented | 100% | Hosted workflow execution remains operational follow-up |

Overall implementation progress: **100%** of the requested improvement list. Remaining work is operational follow-up after the new workflows run, plus optional future visual assets such as source-backed screenshots or logos.
