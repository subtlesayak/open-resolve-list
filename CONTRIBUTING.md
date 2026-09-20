# Contributing

[🌐 Browse the website](https://subtlesayak.github.io/open-resolve-list/) · [Website maintenance](WEBSITE.md)

Suggest additions and corrections through an issue or pull request.

Use the resource or correction form under [New issue](https://github.com/subtlesayak/open-resolve-list/issues/new/choose). The pull request template asks for the same source evidence and practical context.

Write descriptions in plain language: lead with the task a resource helps accomplish, explain its distinguishing feature, and keep important requirements in the entry. Use consistent capitalization, full sentences and final punctuation. Avoid promotional claims, unsupported superlatives and quality rankings based on stars. Preserve upstream names and technical identifiers.

Discovery and recommendation are separate. A recommended starting choice requires reviewed contributor experience with an exact setup, useful result and limitations. Disclose creator/vendor affiliations. Write **Not tested** when there is no first-hand experience; do not invent endorsements. Workflow routes in [START-HERE.md](START-HERE.md) do not imply installation testing.

Keep explicit archived/deprecated evidence in `data/legacy.json`, including the source, check date and reason. Regeneration builds the separate legacy view while retaining entries in the complete catalogue. Do not classify projects as legacy from stars or old push dates alone. Recheck the provider before changing a status.

Original contributions are accepted under CC0-1.0; see [LICENSE](LICENSE), [attribution](NOTICE.md), and [reuse guidance](REUSE.md). Submit only work you have the right to contribute under CC0. This does not relicense any upstream package. Link to providers rather than uploading their installers or paid assets.

Every catalogue entry has an explicit version state in `data/versions.json`. After `node scripts/check-updates.mjs --github`, run `node scripts/build-versions.mjs --github .research/update-check/github.json`, then regenerate the catalogue. Stable releases, prereleases, commit revisions, vendor versions and Reactor package versions must stay distinguishable. Vendor evidence retains its original check date. Missing vendor versions remain `unverified`; never invent version numbers. CI validates the catalogue on Windows and Linux without uploading local reports.

Every `update listings` pass must also review previous catalogue releases and the provider changelog or release source for each changed plugin or resource. Keep those links in `data/provider-updates.json`, expose the relevant catalogue release on the resource page, and verify the Updates page after rebuilding. Do not publish personal data, contact details, credentials, private files, local paths or bookmark-export details anywhere in the repository, GitHub release notes, generated site or submission forms.

Record newly checked vendor versions in `data/version-overrides.json`, with their exact source and check date. These override earlier discovery evidence without rewriting historical snapshots. Do not convert listing/forum ages into release dates.

**Reports are local-only.** Do not commit or upload audit, research, or discovery reports. Keep them in the ignored report paths and show them locally. Publish catalogue entries and structured source data only; public documentation must not link to ignored reports.

Use **Node.js 22 or newer** for the generators and tests (`Map.groupBy` is required). Metadata refresh also requires PowerShell 7 and authenticated GitHub CLI. There are no npm package dependencies. Run `node scripts/build-community-report.mjs`, `node scripts/build-update-report.mjs`, then `node scripts/build-catalogue.mjs` to regenerate all pages. Run `node --test --test-concurrency=1 scripts/*.test.mjs` afterward.

The community section in `data/external-tools.md` ends at `<!-- end community discoveries -->`. Keep hand-written notes outside that generated region; the generator refuses an unterminated region. Local `.research/` and `.release-notes/` folders are ignored and must not be published.

Each README category starts with a complete repository list sorted A–Z by repository name. Linked GitHub-owner subheadings follow for creators with multiple entries, repeating their repositories as a secondary browsing option. Creator groups and their repositories sort A–Z. Single-entry creators appear only in the complete list. Use the repository owner as the grouping key; do not merge different accounts based on similar names. The five alternate sort views retain their catalogue-wide ordering.

- Link to the original public GitHub repository with a clear DaVinci Resolve or Fusion connection.
- Choose the most relevant category; list each repository once.
- Every listings update revisits all previously used sources, reconstructed from the discovery/evidence ledgers and local follow-up notes, including all eleven Reddit communities and their previous seven days of posts/comments. Verify linked creator sources and report inaccessible or partial checks; follow [Every listings update](WEBSITE.md#every-listings-update) and the [Reddit review workflow](WEBSITE.md#reddit-review-trailing-seven-days).
- Generate and review search tags for every new canonical record, with original source links. Commit tags alongside the item and rebuild the website; see [Every listings update](WEBSITE.md#every-listings-update).
- Give a short, factual description of what the project provides.
- Check upstream licensing before using **Free**. Use **Public** when access is known but licensing has not been established; use **Mixed** for combined free and paid offerings.
- Record important edition, operating-system, dependency, cost, and maintenance limitations. Distinguish project cost from Resolve Studio and external-service requirements.
- Edit `data/repositories.csv`, then run `node scripts/build-catalogue.mjs` to regenerate README tables and all five sorted views. Update the introductory total if the number of entries changes. Category counts are generated automatically.
- Set `research_snapshot` to the date the entry was researched. Do not advance it for formatting-only edits or imply installation testing without evidence.
- Preserve upstream credits. Exclude cracks, unauthorized installers, duplicate links, and unchanged forks without a distinct purpose.

Before submitting, confirm that repository URLs are unique, README and CSV entries agree, and links contain no tracking parameters or local file paths.

Maintain external websites and stores in `data/external-tools.md`, then run `node scripts/build-catalogue.mjs`. Official resources on Blackmagic Design's product and document hosts appear in **🏢 Official Blackmagic Design resources**, before all repository categories. Other websites, stores and community forum posts appear in **🌐 External resources**. Both sections sort A–Z and preserve each entry once, including its version, access and platform notes. Edit the source directory rather than the generated README rows.

To refresh stars and latest repository push dates, install Node.js, authenticate the GitHub CLI, and run `pwsh -File scripts/update-metadata.ps1` from the repository. This refreshes the CSV, README, and sorted views from GitHub and records a UTC fetch timestamp. It does not revalidate descriptions, access labels, or compatibility notes. Review the changes before committing.

Relative ages (such as `1 week back`) are calculated as of the metadata-check timestamp, so static GitHub pages do not imply a live clock. Sorting always uses exact timestamps or numeric star counts. **Type** is the catalogue category, not a claim about a project's plugin format. Access badges preserve the original access qualifiers and do not imply that every public project is free.

Run `node --test scripts/catalogue.test.mjs` to verify sorting, relative dates, data preservation, and generated links before submitting.

### Canonical records migration

The canonical per-resource records are maintained directly under `data/resources/`. Add or edit a record, then run `npm run build` and `npm run validate`; the site, README/views, version builder and update checks consume the resulting records through compatibility adapters. Permanent IDs must survive provider URL changes; place old URLs in `urls.previous` only when the rename or redirect is documented. The `kind` field is a discovery taxonomy, not compatibility or licensing evidence. Keep migration reports and raw research local.

To audit upstream updates, run `node scripts/check-updates.mjs --github`, then `node scripts/check-updates.mjs --github-changelogs`, and `node scripts/check-updates.mjs --external`. These read-only checks write research output under `.research/update-check`; keep raw research out of commits. GitHub checks require authenticated `gh`. External checks use unauthenticated public pages and may encounter challenges or JavaScript shells. Root changelog discovery is deliberately bounded and does not crawl every nested documentation link.

Community additions live in `data/community-discoveries.json`; the separate Reactor manifest inventory is `data/reactor-inventory.json`. Run `node scripts/build-community-report.mjs` after reviewed edits. Do not count inventory folders as curated plugins: many are dependencies, host installers or legacy companions. Preserve historical audit scope; later additions have their own dated evidence rather than retroactively claiming an earlier audit checked them. Run `node --test --test-concurrency=1 scripts/*.test.mjs` for the complete validation suite.

Review primary sources before editing `data/update-audit.json`. Extract product versions only from explicit release entries or product metadata. Do not turn page modification, refund-policy, copyright, host-compatibility, or store publication dates into product release dates. Record ambiguous dates, per-platform releases, prereleases, and blocked pages explicitly. Then run `node scripts/build-update-report.mjs` and `node --test --test-concurrency=1 scripts/*.test.mjs`. The evidence ledger is reviewed data; regeneration formats it without silently promoting scraping heuristics into verified release claims.

Platform fields are maintained separately from GitHub star metadata. Use semicolon-separated values in `platforms`: `Windows`, `macOS`, `Linux`, `iPadOS`, `Reference`, or `Unverified`. Assign operating systems only when upstream support statements, installation instructions, or release packages establish them. Use `Reference` for documentation-only resources; absence of an OS is not proof that it is unsupported. Keep partial support, untested platforms, architecture limits, and server-host distinctions in `platform_notes`. Record the supporting URL in `platform_source` and the review date in `platform_checked_at`. Do not infer all-platform support from a DCTL, Python, Lua, or container label alone.

Create a GitHub release only when adding a new provider or recording a verified update from an existing provider. Providers include the creators and maintainers of listed repositories, tools, and external resources. Existing-provider updates can include new tools, published versions, features, fixes, or documented changes to availability, pricing, licensing, and compatibility. Verify each update against the provider's own repository, release notes, or website.

For every listings update, replace `data/latest-update.json` with that update's date, the applicable catalogue release, and only URLs newly added in that pass. Use an empty `added_urls` array when no items were added. The website derives the new-item count from these URLs and keeps it visible until the next listings update; ordinary maintenance must not reset it.

For each qualifying update, add a dated entry to `CHANGELOG.md` naming the provider and every added or updated resource, explaining what changed, and linking to the supporting source. Include purpose, access conditions, and compatibility caveats where relevant. For every verified version change, include the previous and new version numbers and a primary-source link in both the changelog and GitHub release notes. If the previous value was unknown or only a product-family label, say so explicitly. Group all qualifying changes in one catalogue update into one GitHub release. Use versions starting at `v1.0` and increment the minor version for each release (`v1.1`, `v1.2`, and so on), regardless of the date. Release notes should contain only the provider additions and updates included in that release.

README edits, credits, layout, sorting, documentation corrections, tooling changes, routine star/date refreshes, and audits that discover no new provider updates use ordinary commits without a GitHub release. Maintenance snapshots may remain as Git tags only; preserve existing tag numbers and commit targets. Do not reuse or renumber tags to close gaps in the release list. A repository push or metadata refresh alone is not evidence of a provider update. Tag the verified catalogue commit, and keep unresolved leads clearly labelled. Catalogue releases do not imply installation testing or replace the providers' own release notes.

Version reconciliation runs offline in CI against the maintained external evidence and overrides. Use `not-applicable` for reference collections without one version and `reference-edition` for an explicitly dated document edition. Product versions that have not been established remain `unverified`. Devlog dates use `date_kind: devlog`, with optional `date_platform` and `date_version` fields. Historical ledger labels are normalized during regeneration.

Alternate views include every repository and external resource; official resources remain first. Name, type, access and date sorting apply across the remaining entries. Missing dates and inapplicable stars sort last. The source directory also keeps official resources first. External types follow source-directory headings.

The link checker preserves functional query parameters and removes known trackers. PDF/binary responses are marked `unsupported_content` and cancelled; review them with a PDF reader. Dynamic support pages are marked `dynamic_content` and require a rendered-page or provider-API review. Truncation and unsupported encodings are explicit. A retrieved page is not a verified product release. Run generator tests serially because they regenerate shared catalogue files.

## Website requirements and evidence

Follow [the website data guide](WEBSITE.md) when adding structured compatibility, local/cloud behavior or payment models. Record the source, checked date and exact scope of every requirement. Creator confirmations and community tests use separate issue forms and require review before changing evidence labels. The tested-starting-points view accepts only recommendations backed by an exact tested setup. Regenerate with `node scripts/build-site.mjs`; the normal test command includes website checks.
