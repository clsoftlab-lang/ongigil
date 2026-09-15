<!--
SPDX-License-Identifier: Apache-2.0
Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
-->

# 온기길 (Ongigil) — app (PWA)

A free, open-source, public-good web app that helps elderly people who collect
recyclable paper/cardboard find where it has been put out — guided **by voice**,
hands-free, so they can follow by ear while pushing a cart. Citizens and shops
report a spot with one tap; the collector hears direction + distance, repeated as
they walk ("북동쪽 80 미터, 가까워지고 있어요… 앞에 있습니다").

**No money. No ads. No tracking. Neighbours helping neighbours.**

This folder is the frontend PWA — **no build step, vanilla JS modules, no external
CDNs, Korean-first**. It is fully usable **offline in demo mode** with seeded
spots and a simulated walk, so anyone can hear the guidance with no backend and no
API keys. See the design spec: `../docs/en/00-design-spec.md`.

## Run it

Any static server works (the app is plain files):

```bash
# from the repo root
python -m http.server 8150 --directory app
# then open http://localhost:8150/
```

Or use the Claude Code preview: config is in `../.claude/launch.json` (name
`ongigil-app`, port 8150).

## Try it (demo mode, no backend)

1. **안내 받기 (Get guidance)** → **안내 시작 (Start guidance)**. A simulated walk
   begins from a demo origin; watch the **giant arrow** turn and the **distance
   number** count down while the spoken lines appear in the on-screen **안내 말
   (voice transcript)**. On arrival, tap **도착 (Arrived)**.
2. **폐지 알리기 (Report paper)** → tap **여기 폐지 있어요**; a new spot is added
   (with optional amount / kind / until chips). It then shows up in the
   collector's nearby list.
3. **설정 (Settings)** → change voice language (ko/en), speech rate, text size,
   keep-screen-on; export/delete your data.

> speechSynthesis audio may be silent in some embedded preview panes — that is
> fine. The **on-screen transcript** always shows exactly what is spoken (also for
> hard-of-hearing users), and the voice logic is covered by unit tests.

## Connecting a backend

All network calls live in `js/api.js` with a **configurable base URL**
(Settings → 서버 주소, or `prefs.apiBaseUrl`). Leave it **empty** to use the
built-in mock/demo backend. When set, the client calls:

| Call | Method + path |
|---|---|
| Nearby spots | `GET  {base}/spots/nearby?lat=&lng=&radius=` → `{ spots: [] }` |
| Report a spot | `POST {base}/spots` (body: spot) → `{ spot }` |
| Get one spot | `GET  {base}/spots/{id}` → `{ spot }` |
| Feedback | `POST {base}/feedback` (body: `{spotId, kind}`) |

Locations are expected to be **coarsened server-side** before sharing (spec §8).
No key or secret is needed or committed; precise turn-by-turn is an optional
operator upgrade (spec §5) — the free homing (compass/GPS) mode always works.

## Honest limits (spec §6)

A PWA **cannot reliably speak with the screen fully off or backgrounded** —
browsers suspend timers, geolocation and speech. During guidance the app holds a
**Wake Lock** to keep the screen on and **says so plainly** on the guidance
screen. True screen-off background voice navigation needs a native Android app
(a documented next step). We do not pretend the PWA does more than it does.

## Files

```
index.html            app shell
manifest.webmanifest  installable PWA
sw.js                 offline-first service worker (precaches shell)
css/style.css         huge-text, high-contrast, light/dark, 360px-safe
icons/                icon.svg + generate-icons.js (dependency-free PNG) + PNGs
js/
  app.js        router/shell + screens (collector/reporter/helper/settings/help)
  api.js        typed client + base URL + built-in mock
  mock.js       seeded spots + simulated walk (pure)
  geo.js        PURE: haversine, bearing, compass/turn words, closer/farther, arrival
  voice.js      speechSynthesis wrapper + PURE non-flooding queue + callout planner
  sensors.js    Geolocation watch + DeviceOrientation compass (+ movement fallback)
  guidance.js   the loop: sensors + geo + voice; demo + real modes; wake lock
  wakelock.js   keep-screen-on wrapper (honest fallback)
  state.js      observable store; persists prefs + demo spots; never stores paths
  i18n.js       ko-first, {placeholder} substitution, key fallback
i18n/ko.json en.json   warm, short, respectful strings
tests/        node --test: geo, voice queue, i18n parity, mock walk, nearest
```

## Test & verify

```bash
node --test tests/*.test.js     # unit tests (31)
for f in js/*.js icons/*.js; do node --check "$f"; done   # syntax
node icons/generate-icons.js    # regenerate PNG icons
```

## Accessibility

Default text is very large with an even-larger toggle; 56px+ tap targets;
extreme contrast; semantic HTML + ARIA; keyboard operable; screen-reader labels;
`prefers-reduced-motion`; light/dark; works at 360px; never colour alone. Every
collector screen is operable by voice output + one big button.

## Licence

Software **Apache-2.0**. Copyright 2026 CLSOFTLAB (씨엘소프트랩),
Dr. Lee Il-guk (이일국). Designed with Claude; not an Anthropic product.
