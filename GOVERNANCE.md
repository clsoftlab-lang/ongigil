# Governance

This document explains how decisions are made in 온기길 (Ongigil). It is intentionally simple — the
project is small, young, and built as a public good.

## Mission (the tie-breaker)

> Help elderly recyclable-paper collectors find recyclables more easily, by ear, with dignity — as a free,
> open, privacy-respecting public good. No money, no ads, no data sale.

When any decision is unclear, we choose the option that best serves that mission — and, within it, the
**safest and kindest** interpretation for the elderly people the project serves.

## Roles

- **Project lead / maintainer:** **Dr. Lee Il-guk (이일국 박사)**, CLSOFTLAB (씨엘소프트랩). Sets
  direction, is the steward of the design spec, and has final say when consensus can't be reached.
- **Maintainers:** trusted contributors who review and merge changes, triage issues, and uphold the
  standards in [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).
- **Contributors:** anyone who opens an issue, a discussion, or a pull request. You don't need to code —
  accessibility, wording, and community feedback are first-class.
- **Community partners:** community centres, social workers, and organisations who help test or reach the
  people the project serves. Their real-world feedback carries significant weight.

## How decisions are made

1. **Ordinary changes** (bug fixes, docs, small improvements): a maintainer reviews and merges. Be bold,
   be kind.
2. **Design changes** (anything that alters behaviour, data, privacy, or user-facing wording): update the
   **design spec first** ([docs/en/00-design-spec.md](docs/en/00-design-spec.md)), discuss in an issue or
   PR, and reach rough consensus among maintainers.
3. **Sensitive changes** (privacy model, location handling, accessibility guarantees, safety, honesty
   about limits): require explicit maintainer agreement and extra scrutiny. The default answer to
   "should we collect / expose / track more?" is **no**.
4. **Disagreement:** we seek consensus; if we can't reach it, the project lead decides, guided by the
   mission and the safest/kindest option for users.

## Principles that don't get voted away

Some things are foundational and are not up for casual change:

- **Privacy & dignity** — coarsened locations, anonymous reporters, no collector tracking, respectful
  wording.
- **Runs with no keys** — the free homing mode must always work without paid services or committed secrets.
- **Honesty about limits** — we never overstate what the app does (e.g. screen-off voice).
- **Free & open** — Apache-2.0 software, CC BY 4.0 docs; no ads, no data sale, no payments.

Changing any of these would change what 온기길 *is*, and requires a clear, documented, mission-aligned
reason and the project lead's agreement.

## Becoming a maintainer

Sustained, kind, high-quality contributions — code, docs, accessibility, or community work — can lead to
an invitation to become a maintainer. There's no exam; there is trust, shown over time.

## Licensing & attribution

Software is **Apache-2.0**; documentation is **CC BY 4.0**. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
온기길 was designed with Claude (Anthropic's AI) and is **not an Anthropic product**.

## Changing this document

Propose changes via pull request. Governance changes require the project lead's approval.
