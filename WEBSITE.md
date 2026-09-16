# Searchable catalogue

The header Theme button cycles through System, Light and Dark appearances. Its label shows the current preference and its accessible name announces the next choice. The choice is saved locally; System follows the operating-system preference. Both palettes are checked against [WCAG 2.2 AA contrast thresholds](https://www.w3.org/TR/WCAG22/): 4.5:1 for normal text and 3:1 for control boundaries and focus indicators. This is not a complete WCAG conformance audit.

The resource count shows additions from the latest listings update. The number stays unchanged while filtering and until the next listings update; `data/latest-update.json` supplies the date and added URLs.

[🌐 Open Subtle Resolve List](https://subtlesayak.github.io/subtle-resolve-list/)

The website in `site/` provides combined search and filters for tasks, platform, Resolve edition and version, access, payment model, processing, architecture and evidence. Official resources remain first. Resource details show field-specific sources, check dates, limitations and unknown requirements. Product releases and repository activity are separate sort options.

Check **Hide official BMD resources** to browse only community and third-party listings. Uncheck it to show official listings again. This preference is included in shared filter URLs. **Clear filters** resets requirements to the default Resolve Free view while preserving the search text and selected sort order.

Filter options display match counts and disable empty combinations. Selecting a task hides filters without meaningful documented requirements for that task and clears conflicting requirements with a notice; search and sorting are preserved. Version filters use documented Resolve compatibility ranges, not provider release numbers. When version information is missing, a labelled action lets users remove the version constraint and inspect sources. Empty results suggest specific filters to remove, with the resulting counts; they never silently treat unknown compatibility as supported.

## Run locally

With Node.js 22 or later:

```sh
node scripts/build-site.mjs
node scripts/serve-site.mjs
```

Open `http://127.0.0.1:4173`. Stop the preview with Ctrl+C. There are no package dependencies. The preview serves only the site directory, excluding private research and email drafts.

## Maintain the evidence

The site combines `data/repositories.csv`, `data/external-tools.md`, `data/versions.json` and their existing evidence ledgers. Add reviewed structured requirements to `data/resource-details.json`, with field, source URL, review date and limitations. Empty arrays and `unknown` mean not established. Do not derive edition, version, architecture or offline compatibility from a programming language or a file extension.

The canonical records are generated locally under `data/resources/`. They carry permanent IDs, URL aliases, category, format `kind`, tasks, and the existing evidence blocks. `scripts/build-site.mjs` and `scripts/build-catalogue.mjs` consume these records through compatibility adapters. Run `node scripts/migrate-resources.mjs --check` to validate the canonical records without writing. Do not treat inferred `kind` values as evidence.

The site builder also emits `site/resources.json`, a deterministic machine-readable feed containing the 514 canonical resource IDs, source URLs, descriptions, formats, tasks, requirements, versions and field-level evidence. Standalone resource pages at `site/resource.html?id=<permanent-id>` consume this smaller feed rather than the full `site/catalogue.json` payload. The feed is locally generated and should be regenerated with `node scripts/build-site.mjs`; it is not a research report or a source for changing facts.

The same build emits local static API files under `site/api/v1/`: `resources.json`, `categories.json`, `tasks.json`, and `releases.json`, plus `site/feed.xml` containing the latest 50 catalogue entries. These are generated presentation artifacts, not independent sources of truth; contributors edit canonical records and maintained evidence inputs, then regenerate and validate them.

For a local rebuild of the canonical validation, Markdown views, site payloads, API snapshots and feed, run `node scripts/rebuild.mjs`. This command is deliberately local-only and does not publish, upload or run external research.

To inspect conservative taxonomy candidates without changing records, run `node scripts/review-kinds.mjs --kind other` or add `--json` for machine-readable output. The command is read-only and intentionally does not infer or rewrite formats.

The repository has a dependency-free `package.json` for convenience: `npm run build` runs the local rebuild, `npm run validate` runs canonical validation plus the full test suite, and `npm run review:kinds` lists taxonomy candidates.

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

Live on [GitHub Pages](https://subtlesayak.github.io/subtle-resolve-list/). The deployment workflow publishes only `site/`, never the repository root or local research. To publish reviewed changes, run **Publish catalogue website** from the repository's Actions tab on `main`; a normal push validates the catalogue but does not redeploy the website. No custom domain, third-party scripts or fonts are configured. The footer displays a plain-text shared page-view count using [CountAPI](https://countapi.mileshilliard.com/), only on the production site. Counts start with the replacement counter on September 8, 2026; they are approximate page loads, not unique visitors or historical traffic. The fixed public key contains no query, filters or personal visitor data; requests omit credentials and referrers. The service still receives the network request and IP address. A failed increment falls back to a read-only request, never a second increment. If offline, a previously retrieved count is labelled last recorded; without one, the counter is hidden. The public counter is not an audited analytics metric. Catalogue freshness follows reviewed deployments.

Shareable URLs contain the search terms and filter values. The website stores no browsing history or selections in browser storage. Avoid including private project names in links you share.

The edition selector has two choices: Resolve Free (default) and Resolve Studio. Both include unknown-edition listings as assumed compatible; Free excludes recorded Studio-only requirements. Clear filters restores Resolve Free and preserves search text and sorting. Old all-editions and unknown-edition share links migrate to Resolve Free. Platform and version requirements remain separate.

Studio results also include Free-compatible tools, following [Blackmagic Design’s edition feature hierarchy](https://www.blackmagicdesign.com/products/davinciresolve). Where Studio support is inferred from Free support, the result states that it is not separately verified. Platform restrictions and explicit Studio version ranges still apply. Studio support alone never implies Free support.

Hidden search topics are maintained per listing URL in `data/search-tags.json` and included in generated site data. The static website searches these tags alongside titles, creators and descriptions; no server is required. Every listing needs a reviewed tag record. Edit its tags when changing its purpose, and cite creator sources for added brand or film-stock terms. Tags do not alter compatibility filters. Search normalizes colour/color, Fuji/Fujifilm, captions/subtitles, monochrome/black-and-white, diacritics and punctuation.

## Every listings update

Every **update listings** request must revisit **all sources used by the project so far**, including earlier discovery sources and unresolved leads. The source set grows with each update; do not limit a run to recent additions, a few preferred providers or one subreddit.

Build a deduplicated source checklist before starting. Use all `data/*-discoveries.json` ledgers, `data/repositories.csv`, `data/external-tools.md`, the version, requirements, provider-update and audit evidence, `data/reactor-inventory.json`, README credits, and prior local research/follow-up notes. Include listing URLs, original provider/release/changelog links and discovery URLs. Recover previously used public links from locally supplied bookmarks when needed; do not upload the bookmark export, private links or local paths. New sources must be retained in the appropriate evidence ledger or local follow-up queue so the next run includes them.

The checklist must cover these source families:

- All listed GitHub projects, their releases, tags and relevant repository activity, plus previously used GitHub discovery searches and directory repositories.
- Original creator websites, product pages, documentation, downloads and changelogs; previously used marketplaces such as Gumroad, Superhive, Ko-fi, itch.io and creator stores.
- Official Blackmagic Design product, support, download, manual, training, SDK and forum sources, including new support notes and documentation.
- Community directories, wikis, Reactor/package sources, forums and other previously used websites, including links discovered through bookmarks and earlier directory scans.
- All eleven Reddit communities below, relevant monthly and pinned threads, and outstanding links from earlier posts and comments.

For each source, record the attempt time, review window where applicable, outcome and next action in local research notes. Distinguish checked with changes, checked with no relevant changes, inaccessible and partially reviewed. Follow relevant new links, verify them against original sources and deduplicate candidates. A blocked page stays on the checklist for future attempts; it must not silently disappear. Report coverage gaps at completion, and never describe unattempted or partial checks as a complete source review. This workflow does not promise every page or historical comment on the internet has been crawled.

For every new item, generate and review descriptive search tags from its title, description and original creator sources, then add its URL, name, tags and sources to `data/search-tags.json` in the same change. Include specific tasks, effects and supported film-stock concepts where the source documents them; do not guess brand or compatibility claims. Review existing tags when an item's purpose changes.

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
