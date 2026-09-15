# 온기길 (Ongigil) — a warm path

**Neighbours quietly help someone's day. Tap once to say "there's recyclable paper here," and someone
who collects it for a living hears the way — spoken, step by step — without staring at a screen.**

온기길 ("a warm path") is a free, open, public-good service for elderly people who make a living
**collecting recyclable paper and cardboard** with a hand-cart. Citizens and shops report where
recyclables have been put out — **one GPS tap** — and collectors get **hands-free voice guidance** to
the nearest spot: direction and distance, spoken and gently repeated as they walk.

> No money. No ads. No data sale. Just neighbours sharing a little information for social good.

*[English] · [한국어 README](README.ko.md)*

---

## Who it is for — ears, not eyes

The people this is built for are often in their **70s–80s**, on their feet all day for a small income,
sometimes with tired eyes and not always at ease with smartphones. So the whole design bends to them:

- **Ears, not eyes.** A collector can be guided entirely by **voice** — "recyclables to the north-east,
  80 m, getting closer… it's right ahead" — hands-free while pushing a cart. The screen is optional.
- **One big button.** The collector screen is giant text and a single button: *"안내 시작"* (Start guidance).
  No accounts, no menus to get lost in.
- **Warmth, never pity.** This supports people's livelihood and dignity. The wording is respectful,
  plain, and kind — everywhere.

Reporters do the seeing; collectors mostly receive. That is the point.

---

## How it works

```
  REPORTER (citizen / shop)                      COLLECTOR (elderly, hands-free)
  ─────────────────────────                      ──────────────────────────────
  sees recyclables put out                       taps ONE big button: "안내 시작"
  taps "여기 폐지 있어요"   ──►  spot saved  ──►   app finds the nearest open spots
  (one GPS tap; approx location)                 and speaks, and keeps speaking while they walk:
  optional: amount, kind, until-when                "북동쪽 80 m, 가까워지고 있어요"
        │                                            "50 m … 20 m … 앞에 있습니다"
        ▼                                          arrive → "도착했어요"
   spot is live (and expires                      → mark "taken" or "not there"
    on its own so lists stay fresh)                  (keeps the data honest)
```

A reporter shares a spot with one tap. It becomes a live point that **expires on its own** after a few
hours, so a collector is never sent to paper that is long gone. The collector taps once and simply
**follows the voice**. When they arrive they can tap "taken" or "not there" — that small feedback keeps
every spot honest for the next person.

---

## Try it now (demo, no keys)

The app runs fully in your browser in **demo mode** — seeded spots and a simulated walk — so you can
**hear and read the guidance** without a backend and without any keys.

- **Hosted demo:** `https://clsoftlab-lang.github.io/ongigil/app/`
  *(goes live once the operator enables GitHub Pages for the repository; until then, run it locally below.)*
- **Locally:** serve the `app/` folder over HTTP and open it — see [Quick start](#quick-start-developers).

Turn your sound on, press **"안내 시작"**, and let the simulated walk carry you toward a seeded spot.
You will hear the direction, the distance counting down, and "closer / farther" as the position moves.

---

## What's built vs. what a community adds later

| Area | Status | Notes |
|---|---|---|
| PWA app (collector / reporter / helper) | ✅ built | No build step; runs in demo mode with no keys |
| Backend API (report · nearby · feedback · expiry) | ✅ built | Small FastAPI + SQLite service; runs with no keys |
| Homing voice guidance (GPS + compass) | ✅ built | Direction + distance, spoken and repeated; needs no map API |
| Location coarsening / privacy | ✅ built | Shared locations are approximate; precise coords stay server-side |
| Reporting & auto-expiry of spots | ✅ built | Spots expire so lists stay fresh; "taken / not there" feedback |
| **Native app for screen-off voice** | ⚠️ later | A web app can't reliably speak with the screen off — needs a native Android app ([why](#honest-limits-screen-off)) |
| **Precise turn-by-turn** | ⚠️ later | Optional: an operator can add a walking-directions provider key; homing mode always works without one |
| **Real hosting / HTTPS** | ⚠️ later | An operator deploys the API and enables HTTPS + GitHub Pages |
| **Community outreach** | ⚠️ later | Reaching collectors, community centres and social workers — see below |

---

## 🕊️ Privacy & dignity

- **Approximate locations only.** A reported spot is **coarsened** (rounded / snapped to a block) before
  it is shared. Any precise coordinate stays server-side and is **never shown** to other users.
- **Reporters are anonymous.** No names, no faces, no exact home addresses are required to report.
- **Collectors are not tracked.** Guidance uses your position **live**, on your phone; it is not stored
  long-term. You can **export or delete** your data.
- **Respectful wording, everywhere.** This serves people's livelihood — it is never framed as pity.
- **Nothing is sold or shared** with third parties. No ads, ever.

See [docs/en/04-privacy-and-dignity.md](docs/en/04-privacy-and-dignity.md).

---

## ⚠️ Safety

- Guidance is **advisory only.** Please watch traffic and never rush across a road for a spot.
- A **night / early-morning caution** notice is shown; spots on busy roads can be hidden.
- No spot should lead anyone onto private property or into danger — there's a button to report an unsafe spot.
- Large, high-contrast text; simple words; a big **"그만" (Stop)** is always on screen.

See [docs/en/05-accessibility.md](docs/en/05-accessibility.md).

---

## Honest limits (screen-off)

Dr. Lee's wish is guidance with the screen off, like a car navigator in your pocket. We want to be
straight with you: **a web app (PWA) cannot reliably speak with the screen fully off or in the
background** — browsers suspend timers, location and speech to save battery.

So **v0.1 keeps the screen on** during guidance (using the Wake Lock API) and **says so plainly**, and
keeps the spoken sentences short so a pocketed phone is still audible. **True screen-off, background
voice navigation needs a native Android app** — that is the documented next step. We do not pretend the
web app already does screen-off.

See [docs/en/06-deploy-and-limits.md](docs/en/06-deploy-and-limits.md).

---

## The voice guidance, explained simply

No map is needed for the default mode. Your phone already knows two things: **where it is** (GPS) and,
usually, **which way it is facing** (compass). From those the app works out:

- **Which way** the spot is — turned into plain words: *"북동쪽"* (north-east), and, when the compass is
  available, into a turn: *"오른쪽으로 도세요"* (turn right), *"왼쪽 앞으로"* (ahead-left).
- **How far** — spoken at sensible moments and counted down near the end: *"50 m … 30 m … 20 m …
  앞에 있습니다."*
- **Warmer or colder** — *"가까워지고 있어요 / 멀어지고 있어요"* (getting closer / farther), so even a phone
  **without a compass** tells you whether you picked the right way.
- **Arrival** — *"거의 다 왔어요"* then *"도착했어요"*, and a prompt to mark taken / not there.

If a precise walking-directions key is added later, the guidance can switch to street-by-street turns —
but the free homing mode always works. Full details: [docs/en/03-voice-guidance.md](docs/en/03-voice-guidance.md).

---

## For communities & social workers

You don't have to be a collector to use 온기길. A **family member, a social worker, or a community-centre
staffer** can act as a **helper**: report spots on someone's behalf, or set up a collector's phone once
(voice language, speech speed, big text) so all they ever do is press one button and listen.

If your community centre or organisation would like to try 온기길 with the people you support — or help
us test it with real elderly users — we would love to hear from you. Please open a
**Community-partner inquiry** in [GitHub Issues](../../issues/new/choose) or start a
[Discussion](../../discussions). No cost, no catch — this is a public good.

---

## Repository map

```
ongigil/
├─ app/                     # PWA (no build step): collector / reporter / helper — demo mode, no keys
├─ backend/                 # FastAPI + SQLite API: report · nearby · feedback · expiry · coarsening
│  ├─ ongigil/              #   the Python package
│  └─ pyproject.toml
├─ docs/
│  ├─ en/                   # design spec + English guides
│  ├─ ko/                   # 한국어 안내 문서
│  └─ README.md             # documentation index
├─ .github/                 # CI workflow, issue templates, PR template
├─ LICENSES/                # Apache-2.0, CC-BY-4.0 full texts
├─ LICENSE  NOTICE          # software licence + attributions
├─ CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md  GOVERNANCE.md
└─ README.md  README.ko.md
```

> The `app/` folder and the `backend/README.md` are populated by their own build tracks; commands below
> follow the design spec (§9) and each folder's README as it is populated.

---

## Quick start (developers)

**Backend — the API (no keys):**

```bash
cd backend
pip install -e ".[dev]"
# start the API (entry point per backend/README.md as populated), e.g.:
uvicorn ongigil.main:app --reload
# serves report / nearby / feedback / expire over HTTP — no keys, SQLite storage
```

**App — the demo (no build step, no keys):**

```bash
# from the repo root
python -m http.server 8150 --directory app
# then open http://localhost:8150/  → demo mode: seeded spots + a simulated walk you can hear
```

Or use the Claude Code preview (config in `.claude/launch.json`, name `ongigil-app`, port 8150).
The app is plain HTML/JS modules with no bundler and no external CDNs, so any static file server works.
See [docs/en/01-quickstart.md](docs/en/01-quickstart.md) to hear the guidance step by step.

---

## Documentation

- [Design spec (source of truth)](docs/en/00-design-spec.md)
- [01 · Quick start](docs/en/01-quickstart.md)
- [02 · Data model](docs/en/02-data-model.md)
- [03 · Voice guidance](docs/en/03-voice-guidance.md)
- [04 · Privacy & dignity](docs/en/04-privacy-and-dignity.md)
- [05 · Accessibility](docs/en/05-accessibility.md)
- [06 · Deploy & limits](docs/en/06-deploy-and-limits.md)
- [Documentation index](docs/README.md) · [한국어 문서](docs/ko/)

---

## Contributing

Kind, careful contributions are welcome — especially accessibility and voice-quality feedback. Please
read [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md). Because this
serves vulnerable elderly users, **kindness and privacy come first**. Security or location-privacy
concerns: see [SECURITY.md](SECURITY.md). How decisions are made: [GOVERNANCE.md](GOVERNANCE.md).

---

## Contributors

- **Dr. Lee Il-guk (이일국 박사)** — project lead, CLSOFTLAB (씨엘소프트랩)
- **LWJ** · **LMJ** — contributors
- **Claude** (Anthropic's AI) — design and documentation collaborator

---

## Licences

- **Software:** Apache-2.0 — see [LICENSE](LICENSE)
- **Documentation:** CC BY 4.0 — see [LICENSES/CC-BY-4.0.txt](LICENSES/CC-BY-4.0.txt)
- Attributions: [NOTICE](NOTICE)

---

## Not an Anthropic product

온기길 was designed and documented **with Claude, Anthropic's AI assistant**. It is an independent,
community project by CLSOFTLAB — **it is not an Anthropic product** and is not endorsed by or
affiliated with Anthropic.

---

## Sister projects (github.com/clsoftlab-lang)

Other open, public-good projects from the same community:

- [open-walking-safety-helmet](https://github.com/clsoftlab-lang/open-walking-safety-helmet) — a patented walking-safety helmet, open-sourced
- [robosoul-humanoid](https://github.com/clsoftlab-lang/robosoul-humanoid) — an open human-sized bipedal humanoid
- [fireflies](https://github.com/clsoftlab-lang/fireflies) — helium LED jellyfish drifting in the night sky, as art
- [ieodalligi](https://github.com/clsoftlab-lang/ieodalligi) — a community relay project

More at [github.com/clsoftlab-lang](https://github.com/clsoftlab-lang).
