> Part of 온기길 · CC BY 4.0 · © 2026 CLSOFTLAB, Dr. Lee Il-guk

# 06 · Deploy & limits

How to put 온기길 online, what it needs (very little), and — honestly — what a web app **cannot** do yet.
Based on the design spec §5, §6, §9.

---

## Architecture recap

```
  PWA (installable; collector / reporter / helper)  ──HTTPS──►  API (small, stateless)
    Geolocation + DeviceOrientation (compass)                   spots: report · nearby · expire
    speechSynthesis (Korean voice)                              feedback: taken / gone / bad
    Wake Lock (screen on during guidance)                       Directions: Homing (default) | provider stub
    works offline for guidance to a chosen spot                 storage: SQLite · location coarsening
```

- **Frontend:** a PWA — no build step, vanilla JS modules, **no external CDNs**, Korean-first, huge UI.
- **Backend:** small Python **FastAPI** + **SQLite**. Report / nearby / feedback / expire, location
  coarsening, and the `Directions` interface. **Runs with no keys.**
- **Demo mode:** fully client-side (seeded spots + simulated walk), so the voice can be heard from a link
  with no backend at all.

---

## Deploying with no keys

**1. The app (static).** Because the app is plain files with no build step, host it as static content:

- **GitHub Pages** — serve the `app/` folder; the demo lands at
  `https://clsoftlab-lang.github.io/ongigil/app/` once Pages is enabled for the repository.
- Or any static host / your own nginx. No bundler, no CDN, no key.

**2. The API.** Run the FastAPI service (entry point per `backend/README.md` as populated), e.g. behind
uvicorn/gunicorn:

```bash
cd backend
pip install -e .
uvicorn ongigil.main:app --host 0.0.0.0 --port 8000
```

Point the app at the API's URL. That's the whole deployment — no keys, no paid services.

---

## HTTPS is required (not optional)

Modern browsers only grant **Geolocation**, **Device Orientation** and **Wake Lock** on a **secure
context** — i.e. **HTTPS** (or `http://localhost` during development). In production you must serve both
the app and the API over HTTPS, or the voice guidance simply won't get a position or keep the screen on.

- GitHub Pages is HTTPS by default.
- For a self-hosted API, terminate TLS (e.g. a reverse proxy with a free certificate).

---

## The honest screen-off limit

**Dr. Lee's goal is guidance with the screen off, like a car navigator.** We must be straight about this:

> A web app (PWA) **cannot reliably speak with the screen fully off or backgrounded.** Browsers suspend
> timers, geolocation and `speechSynthesis` to save battery once the page is hidden.

So **v0.1 does not claim screen-off.** Instead:

- It uses the **Wake Lock API** to **keep the screen on** during guidance, and **says so plainly** on the
  guidance screen ("please keep the screen on").
- It keeps spoken sentences **short**, so a phone in a shirt pocket (screen on, facing out) is still
  audible.
- Where Wake Lock is unsupported, the app tells the user to keep the screen awake manually.

### The path to true screen-off

**Real screen-off, background voice navigation needs a native Android app** — a foreground service can
hold location and speak with the screen off, which a browser cannot. That native app is the documented
**next step (design spec §10, P3)**. Until it exists, please do not describe 온기길 as doing screen-off;
it keeps the screen on and is honest about it.

---

## Adding precise turn-by-turn later (optional operator key)

The default homing guidance needs no map. If an operator wants **street turn-by-turn**:

1. Implement the provider behind the existing `Directions` interface (`route(from, to) -> steps[]`) — a
   **stub** is already in place next to the default **`HomingDirections`**.
2. Put the provider key in **environment / config only** (e.g. `ONGIGIL_DIRECTIONS_KEY`). **Never commit
   a key**; this repo ships none and works fully without one.
3. Turn the provider on in config. Homing mode remains the always-available fallback.

Suitable providers include Kakao / Naver / Google walking-directions APIs (operator's choice, subject to
each provider's terms).

---

## Deployment checklist

- [ ] App served as static files (GitHub Pages or static host) over **HTTPS**
- [ ] API reachable over **HTTPS**; app pointed at it
- [ ] No keys committed; provider key (if any) in env/config only
- [ ] Spot **expiry** running so lists stay fresh
- [ ] "Keep the screen on" note visible during guidance
- [ ] Privacy defaults on: coarsening enabled, no long-term guidance storage ([04 · Privacy & dignity](04-privacy-and-dignity.md))
