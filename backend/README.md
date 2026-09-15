<!--
SPDX-License-Identifier: Apache-2.0
Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
-->
# 온기길 (Ongigil) — Backend

A small, stateless FastAPI service for **온기길 (Ongigil, "a warm path")** — a free,
open-source public-good tool that helps elderly recyclable-paper collectors find
where recyclables have been put out. Citizens and shops report a spot with one tap;
collectors receive key-free, hands-free homing guidance from the PWA.

No money. No ads. No third-party data sharing. Apache-2.0.

## Runs with no keys

**The whole service boots with zero secrets.** Directions default to a key-free
`HomingDirections` implementation (bearing + distance from GPS/compass, no external
call). A real turn-by-turn provider is an optional upgrade an operator adds later,
purely through the environment — **no key is committed to this repo**.

## Privacy & coarsening — the core design

**Reporters are anonymous (no login).** Every report's exact GPS is kept
**server-side only** and is **never returned by any endpoint**. Instead, at report
time the coordinate is snapped to a grid of roughly `ONGIGIL_COARSEN_GRID_M` metres
(default **75 m**), and only that **coarsened** location is ever shared — in
`/spots/nearby`, `/spots/{id}`, the report confirmation, and export.

**This is enforced at a single choke-point:** `ongigil/services/serialization.py`
is the only code that reads a spot's coordinates on the way out, and it emits only
the coarsened `approx_*` values. No outward schema even has a field for the exact
position, so an exact coordinate is structurally unable to reach a response. A test
(`tests/test_privacy.py`) reports a spot at deliberately off-grid coordinates and
asserts those exact numbers appear in **no** API response.

**Collectors are not tracked:** guidance positions are used live by the client and
not stored long-term. `GuidanceSession` is transient. `PII` is minimal, and
`export`/`delete` endpoints are provided.

## Install & run

```bash
cd backend
pip install -e .[dev]        # fastapi, uvicorn, pydantic v2, sqlmodel (+ pytest, httpx)
python seed.py               # optional: a handful of demo spots near the origin
uvicorn ongigil.main:app --reload
# http://127.0.0.1:8000/health   ·   docs at /docs
```

## Environment (all optional; safe defaults)

| Var | Default | Meaning |
|---|---|---|
| `ONGIGIL_DATABASE_URL` | `sqlite:///./ongigil.db` | SQLite location |
| `ONGIGIL_SPOT_TTL_SECONDS` | `14400` (4h) | how long a report stays live |
| `ONGIGIL_COARSEN_GRID_M` | `75` | privacy grid size for shared locations |
| `ONGIGIL_NEARBY_RADIUS_M` | `1500` | default nearby radius |
| `ONGIGIL_NEARBY_MAX_RADIUS_M` | `10000` | radius cap |
| `ONGIGIL_NEARBY_MAX_RESULTS` | `50` | result cap |
| `ONGIGIL_REGION_LAT` / `_LON` | Seoul | demo origin / region default |
| `ONGIGIL_DIRECTIONS` | `homing` | `homing` (no key) or `provider` (stub → 501) |
| `ONGIGIL_DIRECTIONS_PROVIDER_KEY` | *(empty)* | **env only, never committed** |
| `ONGIGIL_CORS_ORIGINS` | `*` | comma-separated allowed origins |

## API overview

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | liveness + config summary |
| `POST` | `/spots` | anonymous one-tap report (returns **coarsened** spot) |
| `GET` | `/spots/nearby?lat=&lon=&radius_m=&lang=` | open, non-expired spots, coarsened, sorted nearest-first, with bearing/distance/compass |
| `GET` | `/spots/{id}` | one spot (coarsened) |
| `POST` | `/spots/{id}/feedback` | `taken` \| `gone` \| `bad` → updates status (`bad` also flags for moderation) |
| `POST` | `/spots/maintenance/expire` | run the TTL sweep (also runs lazily on every nearby) |
| `GET` | `/directions/route?from_lat=&from_lon=&to_lat=&to_lon=&lang=` | homing steps (bearing + distance); provider mode without a key → **501** |
| `POST`/`GET`/`PUT` | `/users` … | optional prefs (voice/language/rate) |
| `GET` | `/users/{id}/export` · `DELETE` `/users/{id}` | data export / delete (§8) |

### Homing "closer / farther" semantics

`/directions/route` and `/spots/nearby` return a bearing + distance. The client
calls guidance repeatedly as the collector walks and compares successive distances:
a shrinking distance → "가까워지고 있어요 (getting closer)", a growing one →
"멀어지고 있어요 (getting farther)"; the compass word says which way to face.
Arrival/turn cues are computed client-side (§4).

## What a real deployment adds

- A walking-directions **provider key** (Kakao/Naver/Google) via the environment to
  switch `ONGIGIL_DIRECTIONS=provider` on for precise turn-by-turn (optional, §5).
- **Hosting** (HTTPS, a process manager, a persistent SQLite/Postgres volume).
- **Moderation** review of `bad`-flagged spots and community rollout aids (§7, P2).

## Tests

```bash
pytest tests
```
Covers report→nearby (coarsened, sorted, bearing correct), the privacy guarantee
(exact coords never round-trip), TTL expiry, feedback hiding, homing directions,
provider-stub 501 without a key, no-secret-from-anywhere-but-env, export/delete,
and anonymous reporting needing no auth.
