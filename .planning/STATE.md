# Current implementation state

The remaining improvement-list work is being executed in phases with local-only boundaries.

- Overall implementation: 100% of the requested improvement list is implemented in the working tree.
- Tests: `npm run validate` passes 86 tests, including static structural accessibility, loopback-server safety, HTTP smoke verification, real Chrome browser smoke coverage, similar-resource comparison rules, export/related-resource coverage, workflow boundary checks, per-resource API/sitemap generation, and all 514 generated SEO-page checks.
- Comparison: implemented for up to three similar resources. A shared non-generic format, or shared category plus task, is required; incompatible choices are disabled.
- Browser UAT: local Chrome browser smoke passes for catalogue rendering, search, static resource pages, dynamic API-backed resource pages, and keyboard skip-link behavior. The in-app browser remains unsuitable for this check because its runtime sandbox exposed no `window.fetch`.
- External monitoring and deployment workflows are now configured; no new push or publication was performed in this turn.
- Taxonomy review: 34 explicit mappings were applied from maintained descriptions/source URLs; all 43 remaining `kind: other` records now have explicit `retain-other` decisions in the local taxonomy report.

## Next phase

All five requested improvement areas are implemented: aggregate weekly maintenance reporting, validated path-triggered deployment, hosted browser/a11y CI, database-focused branding, and comparison/product enhancements. The comparison dialog now exports CSV and links related resources. First hosted workflow executions remain to be observed; source-backed screenshots/logos are still optional future presentation work. The wizard deliberately does not submit or add records automatically.
