> Part of 온기길 · CC BY 4.0 · © 2026 CLSOFTLAB, Dr. Lee Il-guk

# 02 · Data model — entities & lifecycle

The data model is deliberately tiny. It holds just enough to point a collector at fresh recyclables and
then forget. It is drawn from the design spec (§3); see [00-design-spec.md](00-design-spec.md).

Two privacy rules shape everything here:
- **A shared location is approximate** — coarsened before anyone but the server sees it.
- **A guidance session is transient** — it is not stored long-term; collectors are not tracked.

---

## Roles

| Role | What they do | Login? |
|---|---|---|
| **Reporter** (citizen / shop) | Reports a spot with one GPS tap | No — anonymous |
| **Collector** (elderly) | Receives voice guidance to the nearest spot | No login; optional light profile |
| **Helper** (family / social worker / community-centre staff) | Reports on someone's behalf, or sets up a collector's preferences | No login required |
| **Admin / moderator** | Handles unsafe-spot / abuse reports | Operator-side |

No login is required to report or to be guided. Any profile is optional and minimal.

---

## Entities

### `Spot`
A single place where recyclables have been put out.

| Field | Type | Notes |
|---|---|---|
| `id` | id | Spot identifier |
| `geoApprox` | coords | **Coarsened** location — the only location ever shared |
| `exactGeoPrivate` | coords | Server-side only; coarsened before sharing; **never shown** to other users |
| `kind` | enum | `paper` · `cardboard` · `mixed` |
| `size` | enum | `small` · `medium` · `large` |
| `note` | text | Optional short note |
| `status` | enum | `open` · `taken` · `gone` · `expired` |
| `reportedAt` | time | When it was reported |
| `expiresAt` | time | Auto-expiry (default 4 h, `ONGIGIL_SPOT_TTL_SECONDS`) |
| `reporterRef` | anon ref | Anonymous — no name, face, or address |

### `GuidanceSession` *(transient — not stored long-term)*

| Field | Type | Notes |
|---|---|---|
| `collectorRef?` | anon ref | Optional |
| `targetSpotId` | id | The spot being guided to |
| `startedAt` | time | Session start |
| `lastPos` | coords | Used **live** on the device; not persisted long-term |
| `events[]` | list | In-flight guidance events |

### `Report` / `Feedback`

| Field | Type | Notes |
|---|---|---|
| `spotId` | id | The spot it concerns |
| `kind` | enum | `taken` · `not_there` · `report_bad` |
| `at` | time | When submitted |

### `User` *(optional, minimal)*

| Field | Type | Notes |
|---|---|---|
| `id` | id | |
| `role` | enum | reporter / collector / helper |
| `ageBand?` | enum | Optional, coarse |
| `prefs` | object | `voiceLang`, `speechRate`, `units` |
| `createdAt` | time | |

---

## Spot lifecycle

```
   reported ──► open ───────────────► taken     (collector marked "가져갔어요")
                 │  │                  gone      (someone reported "여기 없어요")
                 │  └────────────────► expired   (expiresAt passed — auto)
                 ▼
        shared as geoApprox only
        (exactGeoPrivate never leaves the server)
```

| Status | Meaning | How it is reached |
|---|---|---|
| `open` | Live and collectable | On report |
| `taken` | Someone collected it | Collector feedback `taken` |
| `gone` | Not there / already cleared | Feedback `not_there` |
| `expired` | Timed out | `expiresAt` passed (automatic) |

**Why auto-expiry?** Recyclables put out on a kerb do not last. Expiring spots after a few hours means a
collector is never sent to paper that is long gone — the list stays honest without anyone tidying it.

---

## What is *not* stored

- No continuous track of where a collector walks (guidance positions are live-only).
- No reporter identity beyond an anonymous reference.
- No precise spot coordinate is ever exposed — only the coarsened `geoApprox`.

Export and delete are available to users. See [04 · Privacy & dignity](04-privacy-and-dignity.md).
