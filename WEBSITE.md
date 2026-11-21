# Searchable catalogue

The header Theme button cycles through System, Light and Dark appearances. Its label shows the current preference and its accessible name announces the next choice. The choice is saved locally; System follows the operating-system preference. Both palettes are checked against [WCAG 2.2 AA contrast thresholds](https://www.w3.org/TR/WCAG22/): 4.5:1 for normal text and 3:1 for control boundaries and focus indicators. This is not a complete WCAG conformance audit.

The resource count shows additions from the latest listings update. The number stays unchanged while filtering and until the next listings update; `data/latest-update.json` supplies the date and added URLs.

[🌐 Open Open Resolve List](https://subtlesayak.github.io/open-resolve-list/)

The website in `site/` provides combined search and filters for tasks, platform, Resolve edition and version, access, payment model, processing, architecture and evidence. Official resources remain first. Resource details show field-specific sources, check dates, limitations and unknown requirements. Product releases and repository activity are separate sort options.

Official Blackmagic Design resources are hidden by default. Check **Show official BMD resources** to include them; uncheck it to return to community and third-party listings. This preference is included in shared filter URLs. **Clear filters** resets requirements to the default All editions view while preserving the search text and selected sort order.

Filter options display match counts and disable empty combinations. Selecting a task hides filters without meaningful documented requirements for that task and clears conflicting requirements with a notice; search and sorting are preserved. Version filters use documented Resolve compatibility ranges, not provider release numbers. When version information is missing, a labelled action lets users remove the version constraint and inspect sources. Empty results suggest specific filters to remove, with the resulting counts; they never silently treat unknown compatibility as supported.

## Run locally

With Node.js 22 or later:

```sh
node scripts/build-site.mjs
node scripts/serve-site.mjs
```

Open `http://127.0.0.1:4173`. Stop the preview with Ctrl+C. Generators have no runtime package dependencies. Browser validation uses development dependencies. The preview serves only the site directory, excluding private research and email drafts.

## Maintain the evidence

The site reads only `data/resources/*.json` for listing facts. Add reviewed requirements and tags to each canonical record, with field-level source URLs, review dates and limitations. The CSV, external Markdown, versions, resource-details and search-tags files are generated compatibility exports. Empty arrays and `unknown` mean not established. Do not derive edition, version, architecture or offline compatibility from a programming language or a file extension.

The canonical records are maintained directly under `data/resources/`. They carry permanent IDs, URL aliases, category, format `kind`, tasks, and the existing evidence blocks. `scripts/build-site.mjs` and `scripts/build-catalogue.mjs` consume these records through compatibility adapters. Run `node scripts/validate-resources.mjs` to validate the canonical records without writing. Do not treat inferred `kind` values as evidence.

The site builder also emits `site/resources.json`, a deterministic machine-readable feed containing the 514 canonical resource IDs, source URLs, descriptions, formats, tasks, requirements, versions and field-level evidence. Standalone resource pages at `site/resource.html?id=<permanent-id>` consume the individual `site/api/v1/resources/<permanent-id>.json` document. The feed is locally generated and should be regenerated with `node scripts/build-site.mjs`; it is not a research report or a source for changing facts.

The same build emits local static API files under `site/api/v1/`: compact `resources.json`, `categories.json`, `tasks.json`, `releases.json`, and detailed `resources/<permanent-id>.json` documents, plus `site/feed.xml` containing the latest 50 catalogue releases in publication-date order. These are generated presentation artifacts, not independent sources of truth; contributors edit canonical records and maintained evidence inputs, then regenerate and validate them.

For a local rebuild of the canonical validation, Markdown views, site payloads, API snapshots and feed, run `node scripts/rebuild.mjs`. This command is deliberately local-only and does not publish, upload or run external research.

To inspect conservative taxonomy candidates without changing records, run `node scripts/review-kinds.mjs --kind other` or add `--json` for machine-readable output. The command is read-only and intentionally does not infer or rewrite formats.

The build scripts have no runtime dependencies; Playwright and axe-core are development-only dependencies. `npm run build` runs the local rebuild, `npm run validate` runs canonical validation plus the full test suite, and `npm run review:kinds` lists taxonomy candidates.

To create a conservative local draft without changing the catalogue, run `node scripts/add-resource.mjs` interactively, or pass explicit `--name`, `--url`, `--creator`, `--category`, `--kind`, and `--description` values. Optional `--tasks` and `--access` values are accepted. The command prints JSON only; it does not fetch, submit, or add the resource.

Use `documented` for provider documentation, `creator` only for a direct attributable confirmation of the named facts, and `tested` only for a reviewed test report describing exact setup and results. A public creator claim that they tested a product is documentation until this catalogue reviews an attributable test report. Notifications, email drafts and acknowledgements do not establish confirmation.

Tested starting points require a `recommendation` with `reason` and `tested_setup`, backed by `tested` evidence. This view intentionally begins empty. A creator confirmation does not imply a recommendation. Review public submissions through the creator-confirmation and testing issue forms; never copy private outreach addresses into catalogue data.

Record before/after observations in `data/provider-updates.json`, linking the corresponding catalogue release and primary source. Keep `catalogue_date` separate from `upstream_date`; do not invent a product release date. Add every verified version change to `CHANGELOG.md` and the matching GitHub release notes. Earlier releases remain linked from the website; structured per-resource history currently starts at v1.14.

Regenerate the site and run:

```sh
node scripts/build-catalogue.mjs
node scripts/build-site.mjs
node --test --test-concurrency=1 scripts/*.test.mjs
git diff --check
```

## Hosting

Live on [GitHub Pages](https://subtlesayak.github.io/open-resolve-list/). The deployment workflow publishes only `site/`. Changes to covered site, data and build inputs on `main` trigger publication after validation. **Publish catalogue website** also supports manual dispatch on `main`.

### Performance baseline

Run `npm run browser:smoke` with `RESOLVE_TEST_MOBILE=1` and `RESOLVE_PERFORMANCE_BASELINE=1` for loopback Chromium measurements. At the cf1db723 baseline on a 390 px viewport, two catalogue requests transferred 1,051,258 bytes including headers (1,050,658 decoded JSON bytes). Creator HTML was 776,442 bytes. Browser checks enforce one request each for the index and model. The decoded limits are 525,329 bytes for the index and 300,000 for creator HTML. At gzip level 6, the respective limits are 95,000 and 28,000 bytes. Gzip budgets compare generated files under the same settings. Timing samples reflect local lab conditions. The browser checks also cover mobile overflow and targeted axe A/AA rules.

Shareable URLs contain the search terms and filter values. Theme, browse preferences, My Resolve Setup and collections are saved locally when storage is available. Collection export/import uses versioned JSON keyed by permanent resource ID; invalid imports preserve existing state. Avoid including private project names in links you share.

The first visit and Clear filters use **All editions**. Free excludes recorded Studio-only tools; unknown requirements remain labelled. Any shared query URL takes precedence over saved browse preferences, including when `edition` is omitted (All editions). Reload preserves the URL; browser back/forward restores that URL without reapplying saved preferences. A bare homepage visit can restore locally remembered browse filters. My Resolve Setup is a separate local assessment and does not silently exclude unknown requirements. Clear filters preserves search and sorting.

Studio results also include Free-compatible tools, following [Blackmagic Design’s edition feature hierarchy](https://www.blackmagicdesign.com/products/davinciresolve). Where Studio support is inferred from Free support, the result states that it is not separately verified. Platform restrictions and explicit Studio version ranges still apply. Studio support alone never implies Free support.

Search topics are maintained as `tags` and `search_sources` in each canonical record and included in generated site data. The static website searches these tags alongside titles, creators and descriptions; no server is required. Every listing needs a reviewed tag record. Edit its tags when changing its purpose, and cite creator sources for added brand or film-stock terms. Tags do not alter compatibility filters. Search normalizes colour/color, Fuji/Fujifilm, captions/subtitles, monochrome/black-and-white, diacritics and punctuation.

## Every listings update

Every **update listings** request must revisit **all sources used by the project so far**, including earlier discovery sources and unresolved leads. The source set grows with each update; do not limit a run to recent additions, a few preferred providers or one subreddit.

An update run follows this order: (1) build the accumulated source checklist; (2) check every maintained GitHub repository, release/tag and discovered changelog; (3) check external providers, BMD support pages, marketplaces and all maintained Reddit communities for the preceding seven days; (4) verify every candidate against its original provider; (5) update canonical records, versions, tags, platform and compatibility evidence; (6) record each qualifying provider change in `data/provider-updates.json` with its source changelog; (7) update `CHANGELOG.md`, create one GitHub catalogue release when the run contains a verified provider addition or change, and refresh `data/catalogue-releases.json`; (8) write `data/latest-update.json`, using an empty `added_urls` array when there are no new resources; (9) run `node scripts/rebuild.mjs` and the full serial test suite; and (10) push the reviewed commit and confirm the Pages deployment. Research captures and local paths never enter the repository or release notes.

Source changelog evidence is kept in `data/provider-updates.json` under each update's `changelogs` array. Repository-wide audit results and discovered root changelog links are kept in `data/update-audit.json`; version evidence is in `data/versions.json` and `data/version-overrides.json`. The public `CHANGELOG.md` and Updates page show the reviewed catalogue changes, while each resource detail page links back to the provider's original release or changelog. A source with no published changelog remains explicitly marked as having no detailed changelog; repository activity alone is not converted into a product update.

GitHub catalogue releases use `## Verified provider updates`, a clear heading for each tool, a readable version line, and short change bullets. Label repository revisions as Source update rather than printing commit hashes. Keep exact revisions in structured version/history data and link the original provider notes and comparisons. Add an `## Added resources` section only when new resources were verified, with a short purpose and access summary for each addition. Use descriptive links, omit empty sections, and preserve earlier release history. The website shows changes as visible bullet lists and keeps provider links in an expandable section.

Build a deduplicated source checklist before starting. Use all `data/*-discoveries.json` ledgers, `data/repositories.csv`, `data/external-tools.md`, the version, requirements, provider-update and audit evidence, `data/reactor-inventory.json`, README credits, and prior local research/follow-up notes. Include listing URLs, original provider/release/changelog links and discovery URLs. Recover previously used public links from locally supplied bookmarks when needed; do not upload the bookmark export, private links or local paths. New sources must be retained in the appropriate evidence ledger or local follow-up queue so the next run includes them.

The checklist must cover these source families:

- All listed GitHub projects, their releases, tags and relevant repository activity, plus previously used GitHub discovery searches and directory repositories.
- Original creator websites, product pages, documentation, downloads and changelogs; previously used marketplaces such as Gumroad, Superhive, Ko-fi, itch.io and creator stores.
- Official Blackmagic Design product, support, download, manual, training, SDK and forum sources, including new support notes and documentation.
- Community directories, wikis, Reactor/package sources, forums and other previously used websites, including links discovered through bookmarks and earlier directory scans.
- All eleven Reddit communities below, relevant monthly and pinned threads, and outstanding links from earlier posts and comments.

For each source, record the attempt time, review window where applicable, outcome and next action in local research notes. Distinguish checked with changes, checked with no relevant changes, inaccessible and partially reviewed. Follow relevant new links, verify them against original sources and deduplicate candidates. A blocked page stays on the checklist for future attempts; it must not silently disappear. Report coverage gaps at completion, and never describe unattempted or partial checks as a complete source review. This workflow does not promise every page or historical comment on the internet has been crawled.

For every new item, generate and review descriptive search tags from its title, description and original creator sources, then add its tags and original sources to the canonical record in the same change. Include specific tasks, effects and supported film-stock concepts where the source documents them; do not guess brand or compatibility claims. Review existing tags when an item's purpose changes.

### Reddit review: trailing seven days

Every **update listings** request includes posts and comments from the seven days immediately preceding the update across **r/davinciresolve, r/editors, r/VideoEditing, r/colorists, r/ColorGrading, r/AudioPost, r/vfx, r/bmpcc, r/blackmagicdesign, r/cinematography and r/Filmmakers**. Include any additional communities used in subsequent research. Record the review time and exact window in the local research notes. Check recent posts and their comment threads, and recent comments on older posts when accessible. Follow relevant links for new tools, creator resources, releases, changelogs and corrections to existing listings.

Use Reddit as a discovery lead: verify additions and factual changes against original creator or official sources, deduplicate existing items, and generate reviewed search tags for new entries. Keep Reddit post/comment permalinks as discovery sources when relevant, and credit contributors where appropriate. Do not treat vote counts, anecdotes or comment dates as proof of compatibility or a product release date.

Also inspect relevant pinned/community-highlight threads in each community, current open-source and Dev/Tools monthly threads, and r/AudioPost's recurring Mine threads. Revisit previously used threads for new comments and unresolved source links, even when the parent post is older than seven days. Confirm current pins in the live community view; search indexes can show old highlights. Keep Adobe/Avid-only plugins and unpublished tool proposals out of the Resolve catalogue unless an independently useful interchange workflow is documented.

If Reddit access, pagination or collapsed/deleted comments limit the review, record what was accessible and retain unresolved leads locally. Do not claim a complete seven-day scan when coverage is partial. Reports and raw research stay local; publish only curated catalogue data and public source links.

Rebuild with `node scripts/build-site.mjs` and run `node --test --test-concurrency=1 scripts/*.test.mjs` before publishing. The build rejects missing, invalid, duplicate and orphan tag records, and the tests verify that every catalogue item has matching searchable tags. New listings must not be published without their tags.

## Release pages

Catalogue, Updates (`updates.html`) and About (`about.html`) are separate pages. Updates groups provider changes under the catalogue's published GitHub release tags, newest first. Within each release, two or more items from the same recorded creator share a creator heading, including additions in the expanded release notes. BMD groups remain first; singleton creators keep their item heading. Tool Details retains each tool's own version history. Both BMD and community changes offer expandable notes and full source links.

After publishing a catalogue release, refresh `data/catalogue-releases.json` with `node scripts/update-catalogue-releases.mjs`, rebuild the site and deploy. The cached public release data keeps browsing independent of GitHub API availability.

The theme palette uses Blackmagic Design's public stylesheet orange (`#f48c00`) with neutral white and charcoal surfaces. Light-mode links use a darker orange (`#a64b00`) for contrast; filled orange buttons use dark text. Reference: https://css.blackmagicdesign.com/css/global.css. Automated contrast checks cover both themes.
## Preserved website address

The previous website at https://subtlesayak.github.io/subtle-resolve-list/ remains available for saved apps and bookmarks. It serves a compatibility copy with a migration notice and an explicit link to the maintained site; it must not force an automatic redirect. Canonical metadata continues to point to https://subtlesayak.github.io/open-resolve-list/.

Generate the compatibility copy with `node scripts/build-legacy-site.mjs` after building the main site. Only the generated public assets in the ignored `.legacy-site/` directory belong in the separate `subtlesayak/subtle-resolve-list` hosting repository. That repository uses branch-based Pages hosting from `main` at `/`. Main-site updates do not automatically refresh this compatibility copy; the notice directs visitors to the new address for the latest catalogue.

## Database browsing and review

The homepage loads `site/catalogue-index.json` and the small `site/latest-update.json` badge summary. Details are fetched by permanent ID only when opened; failed loads offer a retry and successful responses are cached for the current page. Format, task, platform and requirement filters round-trip through URLs. Resolve version choices come from recorded compatibility ranges.

Static resource pages expose compatibility, requirements, access, evidence coverage, version history and related resources. The JSON-LD main entity distinguishes software, reference articles, training, collections and creative assets. The RSS feed contains dated catalogue releases, with stable release URLs as GUIDs.

Weekly maintenance reports review candidates, with links to their sources. Its source queue combines GitHub repository metadata, repository changelogs, external provider checks and followed changelog pages. Temporary failures and rate limits can get one retry. If a server asks us to wait more than five seconds, the page stays in the queue for review. The summary counts blocked and incomplete checks separately from sources that were never attempted. Metadata alone leaves a source pending review. Use the full discovery-source review above for formal listing updates.

When Changedetection.io is connected, the maintenance summary reports which watches completed a recent check and which are overdue, failed, paused, or awaiting a check. A configured 14-day schedule can exist before the first check runs.

Browser CI exercises Chromium, Firefox and WebKit at desktop and mobile viewport sizes. This is browser automation, not physical-device or installed-PWA testing. Raw research stays local. The original migration is archived at `scripts/archive/migrate-v1-to-v2.mjs`; do not run it over maintained canonical records.

## Workflow discovery and local collections

`data/workflows.json` defines source-backed editorial recipes; `scripts/workflow-pages.mjs` generates their crawlable routes and the Workflow Finder. Capability matching and synonyms live in `site/discovery-model.mjs`; they summarize reviewed catalogue text and never establish compatibility. Similar alternatives require a specific shared capability. `data/relationships.json` separately records complementary handoffs with reasons and source URLs. A documented export/import handoff is not an installation test. Comparison links apply the same similarity predicate and retain the three-tool limit and CSV export.

Opening a comparison loads the selected resources' detailed records for installation, dependencies, account requirements and platform caveats. These fields also appear in the CSV export. Missing records are labelled unavailable and can be retried; missing facts remain not established. Differences only applies to both comparison tables. Expand each resource's source notes for its recorded limitations. None of these additional records are fetched for an ordinary browse visit.

My Resolve Setup assesses selected edition, version, OS and architecture fields locally as Documented match, Requirements unknown or Documented incompatibility. It does not filter out unknowns automatically. GPU notes remain in source-backed details. Original conceptual preview illustrations and their rights/context are recorded in `data/previews.json`; they are explicitly not product output.

Setup assessments require a citation scoped to each selected field. A partial platform or architecture list does not establish exclusion of every unlisted target. An edition-scoped version range remains unknown until that edition is selected; Free support does not independently establish Studio support in My Resolve Setup. Compatibility source mappings live in `site/compatibility-evidence.mjs`; keep them tied to the existing canonical source and claim. Compact browse records carry evidence flags, while original citations remain available on demand through resource pages and details.

The builder writes a content hash to `site/catalogue-version.mjs` so all browse consumers request the same generated index version. `data/creator-guides.json` supplies reviewed learning links and topics for the initial educator guides. Source-review captures preserve blocking, JavaScript dependencies, unsupported formats and truncation as incomplete coverage; an HTTP success alone is not an editorial verification.
