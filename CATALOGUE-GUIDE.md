# Reading the catalogue

[🌐 Searchable website](https://subtlesayak.github.io/subtle-resolve-list/) · [🎬 Catalogue](README.md) · [🧭 Start with a task](START-HERE.md)

## Access labels

- **Free** means explicit free availability or an open-source license was identified.
- **Mixed** means free and paid editions, optional paid services or a collection containing both.
- **Paid** means a payment or license is required; preserve any trial conditions.
- **Public** means a public listing or repository; licensing and ready-made downloads may still be unverified.

Resolve Studio, hardware and external service costs are separate from a tool's price. Public access does not establish open-source or redistribution rights. See [attribution](NOTICE.md) and [reuse guidance](REUSE.md).

## Versions and activity

[Version records](data/versions.json) distinguish stable releases, prereleases, source commits, vendor/package versions, document editions, not-applicable references and unknown versions. A commit is not a software release. Product-family numbers are labelled as such.

Markdown relative ages are calculated at the recorded check date; the website calculates relative ages when viewed. Repository ages describe pushes. External ages identify the supporting release, devlog, installer or manifest date. **†** means a recorded date is more than two years old; it does not prove abandonment. Unknown dates are never guessed from when a webpage was checked.

## Platforms supported

| Label | Meaning |
| --- | --- |
| 🪟 Windows | Windows support or installation documented upstream. |
| 🍎 macOS | Check Intel/Apple Silicon and distribution restrictions. |
| 🐧 Linux | Check distribution, GPU and driver requirements. |
| 📱 iPadOS | An iPad workflow is explicitly documented. |
| 📖 Reference | Documentation or a collection, not an OS claim. |
| ❔ Unverified | Support has not been established. |

Platform links open the supporting source. Notes preserve partial or untested support. None of these labels implies installation testing by this catalogue.

## Browse and verify

Each README category lists all repositories A–Z, followed by repeated groups for creators with multiple entries. Deduplicate by URL when importing. All five sorted views include external resources and keep official sources first; inapplicable stars and unknown dates sort last.

The [repository CSV](data/repositories.csv) and [external directory](data/external-tools.md) remain the migration inputs for catalogue generation. [Version overrides](data/version-overrides.json) take precedence over earlier evidence. Read the [historical update ledger](data/update-audit.json) with [later discoveries](data/community-discoveries.json). The [Reactor inventory](data/reactor-inventory.md) includes dependencies and non-Resolve companions; it is not a list of 707 verified Resolve plugins.

## Canonical resource records

The canonical records live in [`data/resources/`](data/resources/) and are indexed by [`data/resources/index.json`](data/resources/index.json). Each record has a permanent `id`, a canonical URL, optional previous URL aliases, a broad `category`, a separate `kind`/format, and task labels. The site and README/views builders consume these records through compatibility adapters; the CSV/Markdown files remain legacy-compatible inputs for migration and review.

Run `node scripts/migrate-resources.mjs --check` to validate all 514 records without writing. IDs are not derived from URLs, so a documented provider rename must preserve the ID and move the old URL to `urls.previous`. Do not use inferred `kind` values as compatibility, licensing, or installation evidence.

Consumers should resolve a resource through its permanent ID first, then its canonical or documented previous URL alias. The shared resolver is available from `scripts/canonical-source.mjs`; duplicate aliases fail validation.

Check current creator documentation before relying on compatibility, pricing or a version. Use [TOOL-FINDER.md](TOOL-FINDER.md) for detailed matching guidance and [CONTRIBUTING.md](CONTRIBUTING.md) to correct an entry.
