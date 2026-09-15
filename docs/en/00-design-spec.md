# 온기길 (Ongigil) — Recyclable-Paper Finder for Cart Collectors — Design Spec (v0.1)

> **Status:** Reference design + working web app (v0.1). This document is the single source of truth;
> the app, API and guides follow it. Change it first, then the code.

- Project: **온기길 (Ongigil)** — "a warm path". A free public-good service that helps elderly people who
  make a living **collecting recyclable paper/cardboard** find where it has been put out. **Citizens and
  shops report** "there's recyclable paper here" with one tap (GPS); collectors get **spoken, hands-free
  guidance** — "recyclables 80 m to the north-east, getting closer… it's right ahead" — so they can follow
  by ear while pushing a cart, without staring at a screen.
- No money changes hands. This is pure information sharing for social good.
- Project lead: **CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국 박사)**. Contributors: LWJ, LMJ.
- Designed with Claude (Anthropic's AI). Not an Anthropic product.
- Licences: software Apache-2.0 · docs CC BY 4.0.

---

## 1. Who it is for, and the one design rule

The users are **elderly cart collectors** — often in their 70s–80s, walking all day for a small income,
sometimes with poor eyesight, not always comfortable with smartphones. **Everything bends to them:**

| # | Principle | Consequence |
|---|---|---|
| O1 | **Ears, not eyes** | A collector can get guidance entirely by **voice**, hands-free, while pushing a cart — direction + distance spoken and repeated ("north-east, 80 m, getting closer"). The screen is optional. |
| O2 | **One big button** | The collector screen is huge text + one button ("Guide me to the nearest"). No accounts, no menus to get lost in. |
| O3 | **Works with no keys, no map service** | The default guidance uses only the phone's GPS + compass (a "homing" direction + distance), so it runs anywhere with **no paid map API**. Precise turn-by-turn is an optional upgrade an operator can add later (§5). |
| O4 | **Kind neighbours provide the data** | Citizens and shops report where recyclables are put out (A-model). Collectors mostly **receive**. |
| O5 | **Safety first** | Warn near roads / at night; never push someone into a dangerous move; guidance is advisory. |
| O6 | **Privacy & dignity** | Report locations are shown **approximately**; no faces, no exact home addresses; no tracking of collectors; nothing sold. Treat everyone with respect in wording. |
| O7 | **Honest about limits** | A web app cannot reliably speak with the screen fully off (§6). We keep the screen on and say so; true screen-off voice needs a native app later. |
| O8 | **Free & open** | No payment, no ads, no data sale. Apache-2.0 / CC-BY only. |

---

## 2. The loop

```
 REPORTER (citizen / shop)                COLLECTOR (elderly, hands-free)
 ─────────────────────────                ──────────────────────────────
 sees recyclables put out                 taps ONE big button: "안내 시작"
 taps "여기 폐지 있어요"  ──► spot saved    ──►  app finds the nearest open spots
 (GPS, approx; optional: type/amount,           speaks, and keeps speaking as they walk:
  "big pile", "until 6pm")                      "북동쪽 80 m, 가까워지고 있어요"
        │                                        "50 m … 20 m … 앞에 있습니다"
        ▼                                        arrive → "도착했어요" → mark taken / not there
   spot is live on the map                       (spots expire so lists stay fresh)
```

Reports expire automatically (default a few hours, configurable) so collectors are never sent to
recyclables that are long gone. A collector can mark a spot "taken" or "not there" to keep data honest.

---

## 3. Roles, data, screens

**Roles:** reporter (citizen/shop — anonymous, one tap), collector (elderly — receives guidance),
helper (a family member / social worker / community-centre staff who reports or sets up on someone's
behalf), admin/moderator. No login required to report or to be guided; optional lightweight profile only.

**Entities:**
- `Spot {id, geoApprox, exactGeoPrivate(server-side, coarsened before sharing), kind(paper|cardboard|mixed),
  size(small|medium|large), note, status(open|taken|gone|expired), reportedAt, expiresAt, reporterRef(anon)}`
- `GuidanceSession {collectorRef?, targetSpotId, startedAt, lastPos, events[]}` (transient; not stored long-term)
- `Report/Feedback {spotId, kind(taken|not_there|report_bad), at}`
- Minimal `User {id, role, ageBand?, prefs(voiceLang, speechRate, units), createdAt}` — optional.

**Screens:**
- **Collector (default, huge UI):** big "안내 시작" button → nearest-spots list (big rows: direction arrow,
  distance, "안내") → **guidance screen** (giant arrow + distance, big "도착/여기 없어요/그만" buttons; voice
  speaks throughout; a persistent "keep the screen on" note). A "가까운 곳 소리로" quick action.
- **Reporter:** one screen — a big "여기 폐지 있어요" button that captures GPS; optional quick chips
  (양 적음/보통/많음, 종류, 언제까지); confirmation; "고맙습니다" (this helps someone's day).
- **Helper:** report on behalf; set a collector's preferences (voice speed, language); simple how-to.
- **Settings:** voice language (ko default, en), speech rate, units (m), keep-screen-on, text size,
  data export/delete, the map-upgrade note.
- **Help / safety / about.**

---

## 4. Voice guidance (the heart) — free "homing" mode

Default mode needs **no map API**: just the browser's Geolocation (position) and, where available,
Device Orientation (compass heading). The app computes bearing + distance to the target and speaks it,
repeating as the collector moves.

- **Bearing → words:** convert bearing to 8-point compass in the user's language ("북동쪽"), and, when the
  compass heading is available, to relative turns ("오른쪽으로 도세요", "왼쪽 앞으로") — the "left 10 m /
  right 10 m" feel Dr. Lee asked for, done from heading + bearing, no map.
- **Distance cues:** spoken at sensible thresholds (e.g. every ~20 m of change, and countdowns under 50 m:
  "50 m … 30 m … 20 m … 앞에 있습니다"), with "가까워지고 있어요 / 멀어지고 있어요" so a collector without a
  compass still knows if they picked the right way.
- **Arrival:** within ~15 m → "거의 다 왔어요", within ~8 m → "도착했어요" → prompt taken / not there.
- **Speech:** Web Speech API `speechSynthesis`, Korean voice, adjustable rate; short, calm, respectful
  sentences; never a wall of talk; a mute/repeat button.
- **No compass?** (many phones/iOS need a permission and some lack it) → fall back to bearing-from-movement:
  infer heading from consecutive GPS points while walking; still say direction + "closer/farther".
- **Optional precise turn-by-turn (upgrade, §5):** if an operator adds a walking-directions provider key,
  guidance can switch to street turn-by-turn. Off by default; the free homing mode always works.

## 5. Map / directions — key goes in later (operator)

- A `Directions` interface: `route(from, to) -> steps[]`. Ships with a **HomingDirections** implementation
  (compass/GPS, no key, the default) and a **stub** for a real provider (Kakao/Naver/Google walking API).
- The provider key is **env/config only**, added by whoever runs it later — this repo needs **no key** and
  works fully in homing mode. No key or secret is committed.

## 6. Screen-off / background — honest limits

- Dr. Lee's goal is guidance with the screen off, like a car navigator. A **web app (PWA) cannot reliably
  speak with the screen fully off or backgrounded** — browsers suspend timers, geolocation and speech.
- v0.1 therefore uses a **Wake Lock** to keep the screen on during guidance and says so plainly, and keeps
  sentences short so a pocketed phone is still audible. **True screen-off, background voice navigation needs
  a native Android app** (documented as the next step). We do not pretend the PWA does more than it does.

## 7. Safety

- Guidance is advisory; the app tells collectors to watch traffic and never rush across roads.
- Night/early-morning caution notice; optional "hide spots on busy roads".
- No spot may direct someone onto private property or into danger; report button for unsafe spots.
- Large, high-contrast text; simple words; a big "그만" (stop) always visible.

## 8. Privacy & dignity

- Reports store an **approximate** location for sharing (coarsened, e.g. rounded / snapped to a block);
  any precise coordinate stays server-side and is never shown to other users.
- No faces, no names, no exact home addresses required. Reporters are anonymous.
- Collectors are **not tracked**: guidance positions are used live and not stored long-term; export/delete
  available.
- Wording throughout is respectful and warm — this serves people's livelihood and dignity, never framed as pity.
- Nothing is sold or shared with third parties. No ads.

## 9. Architecture

```
 PWA (installable; collector / reporter / helper modes)  ──HTTPS──►  API (small, stateless)
   Geolocation + DeviceOrientation (compass)                        spots (report, nearby, expire)
   speechSynthesis (Korean voice)                                   feedback (taken/gone/bad)
   Wake Lock (screen on during guidance)                            Directions(Homing default | provider stub)
   works offline for guidance to a chosen spot                      storage: spots (SQLite), coarsening
```

- **Frontend:** PWA, no build step, vanilla JS + modules, no external CDNs; huge accessible UI; Korean-first.
- **Backend:** small Python (FastAPI) API, SQLite; report/nearby/feedback/expire; location coarsening;
  the `Directions` interface (homing default, provider stub). Runs with **no keys**.
- **Demo mode:** the app runs fully client-side with seeded spots and simulated walking, so anyone can hear
  the voice guidance by a link — no backend, no keys.

## 10. Phases

| Phase | Scope |
|---|---|
| P0 | Working demo: report a spot → collector hears homing voice guidance to it (simulated walk), all in-browser |
| P1 | Backend: real reports, nearby query, expiry, feedback, coarsening; PWA against it; wake-lock; helper mode |
| P2 | Community rollout aids: multi-language voices, community-centre/helper tools, accessibility review with real elderly users |
| P3 | Native Android app for true screen-off background voice navigation; optional precise turn-by-turn (operator key) |

## 11. Naming

Working title **온기길 (Ongigil, "a warm path")**. Alternatives: **모아 (Moa)**, **온기지도**, **줍고**,
**이음길**, **손수레**. The operator picks the final name; it's a one-line change.
