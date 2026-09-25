# 🎬 Open Resolve List — DaVinci Resolve Plugins & Tools

A personal, open directory of **DaVinci Resolve plugins, Fusion tools, DCTLs, LUTs, PowerGrades, scripts and templates**: **264 public GitHub repositories** and **251 external resources**, with original creator links, documented requirements and update references.

I made Open Resolve List to keep useful Resolve resources in one place instead of repeatedly scouring scattered links. The website is hosted on GitHub Pages, with the catalogue and source records available in this repository. If it helps your workflow, you are welcome to use it and suggest improvements.

[🌐 Browse the searchable website](https://subtlesayak.github.io/open-resolve-list/) · [🎬 Creators and educators](https://subtlesayak.github.io/open-resolve-list/creators.html) · [🆕 Provider and catalogue updates](https://subtlesayak.github.io/open-resolve-list/updates.html) · [ℹ️ About](https://subtlesayak.github.io/open-resolve-list/about.html)

## 🔎 Find something for your workflow

- Search names, creators, descriptions and reviewed tags, or try tasks such as **film emulation**, **captions** or **Fusion**.
- Filter by task, format, platform, Resolve edition and version, access, payment model and processor architecture. Unknown requirements stay labelled; a search match is not a compatibility guarantee.
- Browse A–Z by default, or sort by relevance, creator, category, format, stars, release/update date or repository activity.
- Compare similar resources side by side, export the comparison as CSV, and share a link with your search and filters.
- Open resource and creator pages for original links, available requirements, source evidence and update references. The creators directory also includes educators and training providers.

For help from an AI assistant, share this repository link along with your task, operating system, Resolve edition/version and budget. Ask it to use [START-HERE.md](START-HERE.md), [the catalogue guide](CATALOGUE-GUIDE.md) and the linked source evidence, and to flag missing compatibility details instead of guessing. Machine-readable guidance is available in [llms.txt](site/llms.txt).

## 📚 Catalogue and guides

- [Browse the full catalogue](CATALOGUE.md)
- [Find tools by task](START-HERE.md)
- [Read access, platform and evidence labels](CATALOGUE-GUIDE.md)
- [Use sorted catalogue views](views/latest-updated.md)
- [Suggest or correct a resource](CONTRIBUTING.md)

## 🧾 Evidence and updates

Facts are labelled as source documented, creator confirmed, community tested or not established. A linked source does not mean a tool was installed or tested. AI assists discovery and organization; recorded sources and editorial review determine what is published.

Relative update ages identify their source: a repository push, provider release, devlog or package update. **†** marks an update date more than two years old, not proof of abandonment. Missing dates remain **Unknown**.

Catalogue releases group new providers/resources and verified updates to existing ones, with original release or changelog links where available. Website, README and other maintenance changes use Git history/tags, without a catalogue release. See the [Updates page](https://subtlesayak.github.io/open-resolve-list/updates.html) or subscribe to the [release feed](https://subtlesayak.github.io/open-resolve-list/feed.xml).

## 🤝 Contribute and credits

Found a useful resource, a broken link or an incorrect listing? [Open an issue](https://github.com/subtlesayak/open-resolve-list/issues/new/choose). Creators can request corrections or removal; tested-workflow reports should include the exact setup and limitations.

Thanks to the original creators and to **Greenysmac**, **cutbypham**, **Akascape**, **CommandPost**, **hassaancode**, **PostFlows**, the maintainers of **DCTLs.info**, **Editors Lab** and **Resolve Directory**, and the community contributors whose directories and discussions helped discovery. [Full credits and source links](CATALOGUE.md#credits). This is an independent personal project, unaffiliated with Blackmagic Design.

Original project contributions are offered under [CC0](LICENSE). Linked tools and third-party material keep their own licenses and terms; see [licensing and attribution](NOTICE.md).

## 🛠️ Local maintenance

The maintained records live in [`data/resources/`](data/resources/). The README, catalogue views and site data are generated from them. Build and validate locally:

```text
npm run build
npm run validate
```

See [website maintenance and hosting](WEBSITE.md) for local preview and source-evidence rules.
