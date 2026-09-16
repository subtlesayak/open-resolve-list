# Find DaVinci Resolve tools for a specific workflow

[🌐 Search and filter the catalogue](https://subtlesayak.github.io/subtle-resolve-list/) · [📖 Catalogue guide](CATALOGUE-GUIDE.md)

This guide helps readers and AI assistants use [Subtle Resolve List](CATALOGUE.md) to recommend tools for a stated need. It describes how to interpret the catalogue; it does not establish new compatibility claims. Follow the user's requirements and use current provider documentation to resolve uncertain details.

## Understand the requirement

Start with the desired result and current workflow. Use details the user has already provided. Ask a short follow-up only when missing information would change the recommendation; otherwise state assumptions and give conditional options.

Useful details include:

- **Outcome:** the task to complete, input media, desired output, and whether it must happen inside Resolve or can use a companion application.
- **Environment:** Resolve version, Free or Studio, operating system, CPU architecture, and GPU where relevant. On macOS, check the App Store versus Blackmagic distribution when the tool distinguishes them.
- **Budget and rights:** free-only, one-time purchase, subscription tolerance, commercial-use requirements, and whether open source is required.
- **Privacy and setup:** offline operation, permission to upload media, cloud/API accounts, coding experience, Python or other dependencies, and willingness to build from source.
- **Task-specific needs:** subtitle languages and styling, footage color space, timeline exchange format, audio channel support, hardware, or batch volume as applicable.

Do not ask every question for every task. For example, GPU details matter for GPU-dependent tools but may not affect a printable shortcut reference.

## Choose the starting point

Search descriptions and caveats as well as names. Use the route below to build a candidate list, then search the external directory for related tools and alternatives. Categories are starting points, not exclusive filters.

| Desired outcome or search terms | Start here |
| --- | --- |
| Official downloads, manuals, training, SDKs and support | [Official Blackmagic Design resources](CATALOGUE.md#official-resources) |
| Color grading, film emulation, LUTs, PowerGrades, DCTLs, color transforms | [Color and DCTL tools](CATALOGUE.md#category-1) |
| Motion graphics, keying, tracking, background removal, shaders, Fuses, effects | [Fusion and VFX](CATALOGUE.md#category-2) |
| Subtitles, transcription, captions, silence removal, dialogue editing | [Captions and editing](CATALOGUE.md#category-3) |
| AI assistants, MCP, ComfyUI, natural-language automation | [AI integrations](CATALOGUE.md#category-4) |
| Markers, timelines, bins, metadata, fonts, batch operations, workflow bridges | [Scripts and workflow tools](CATALOGUE.md#category-5) |
| Codecs, AAC, export, proxies, render queues, project servers, backups | [Encoding and servers](CATALOGUE.md#category-6) |
| Linux installation, containers, dependencies, distribution troubleshooting | [Linux tools](CATALOGUE.md#category-7) |
| Scripting API, Python/Lua development, DCTL development, code examples | [Developer libraries and references](CATALOGUE.md#category-8) |
| MIDI, control surfaces, Speed Editor, shortcut devices | [Hardware tools](CATALOGUE.md#category-9) |
| Wider collections and community discovery | [Directories](CATALOGUE.md#category-10) |
| Commercial plugins, creator stores, audio effects, PowerGrades, companion apps | [Community and third-party resources](CATALOGUE.md#external-resources) |

## Read the catalogue accurately

| Source or field | How to use it |
| --- | --- |
| [data/repositories.csv](data/repositories.csv) | Canonical structured GitHub entries. Parse as CSV, including quoted descriptions and commas. Each repository occurs once. |
| `repository`, `url`, `category`, `description` | Identify the creator/repository, original source, intended task, and documented caveats. |
| `access` | Preserve the full label and qualifiers. Free availability, open-source licensing, and commercial-use rights are separate questions. |
| `platforms`, `platform_notes` | Platforms are semicolon-separated; notes contain restrictions. Missing support is unknown, not confirmed incompatibility. `Reference` is not a supported operating system. |
| `platform_source`, `platform_checked_at`, `research_snapshot` | Trace the evidence and its review date. Recheck upstream if compatibility is decisive. |
| `stars`, `last_pushed_at`, `metadata_checked_at` | Popularity and activity snapshots. Stars do not prove quality or suitability; a push timestamp is not a release date. |
| [data/external-tools.md](data/external-tools.md) | Canonical external entries with direct links, access, platforms, and descriptions. Collections may overlap separately listed products. |
| [data/versions.json](data/versions.json) | Current reviewed version states and source dates. Distinguishes releases, source revisions, document editions, not applicable and unknown. |
| [data/version-overrides.json](data/version-overrides.json) | Reviewed corrections that take precedence during version generation; retain the exact source and check date. |
| [data/update-audit.json](data/update-audit.json) and [later discovery evidence](data/community-discoveries.json) | Historical baseline and subsequent additions. Read both; an old audit is not proof of today's latest version. |
| README and [sorted views](views/name.md) | Human-readable browsing. Creator groups intentionally repeat repositories; deduplicate by canonical URL. |
| [Catalogue changelog](CHANGELOG.md) | Additions and updates to this directory. Its version numbers are not the listed providers' software versions. |

If browsing is available, open the linked files and the shortlisted providers' documentation. If a file or provider page cannot be retrieved, identify the missing evidence. Do not claim to have searched the full catalogue from a truncated preview or treat a failed request as proof that a tool is unavailable.

## Select suitable matches

1. Identify candidates by the actual capability requested, including synonyms and related workflow categories. Check both GitHub entries and external resources.
2. Apply hard requirements first: host/edition/version, OS and architecture, licensing, budget, privacy, and essential features. Exclude confirmed conflicts. Keep unknown requirements explicitly conditional.
3. Verify the shortlist against original documentation, installation guides, release notes, or creator listings. Preserve restrictions on GPU support, external services, Studio-only features, and source-only distributions. Distinguish Resolve plugins from standalone applications and reference directories.
4. Prefer the closest functional fit, then compare setup effort, workflow integration, documented support, cost, and maintenance. Use stars only as supplementary context. Avoid arbitrary numerical scores that imply measured performance.
5. Explain tradeoffs. A free tool requiring Studio does not meet a Resolve Free requirement. A free client requiring paid API usage does not meet a zero-cost requirement. A locally installed app is not necessarily offline. An open repository is not necessarily open source.
6. If no verified match exists, say which requirement blocks the candidates. Offer a clearly labelled partial match or ask whether the user can relax that requirement. Do not invent tools, features, licences, prices, benchmarks, or compatibility.

## Give a useful answer

Lead with the best supported match and why it fits. Recommend up to three distinct options when alternatives are useful; fewer is better than padding the shortlist. Include:

- The tool and creator, with its original repository or product link.
- How it addresses the requested outcome and any workflow limitations.
- Cost/licence, Resolve edition/version, platform, dependencies, and offline/cloud behavior relevant to the user.
- The decisive source links, distinguishing catalogue evidence from documentation checked during the conversation.
- Unverified requirements and the next practical step, such as checking an installer or following the creator's setup guide.

Keep confirmed matches separate from conditional alternatives. Describe documentation checks honestly; do not imply hands-on installation or performance testing. Never recommend downloading or running code solely because it appears in this directory.
