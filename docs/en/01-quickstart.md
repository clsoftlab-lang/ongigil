> Part of 온기길 · CC BY 4.0 · © 2026 CLSOFTLAB, Dr. Lee Il-guk

# 01 · Quick start — run the demo and hear the guidance

This page gets you from nothing to **hearing the voice guidance** in a few minutes. No keys, no paid
services. There are two ways: the in-browser demo (fastest) and the app talking to the real backend.

---

## A. The in-browser demo (no backend, no keys)

The app ships a **demo mode**: seeded spots and a simulated walk, entirely client-side, so you can hear
and read the guidance from a single link.

1. Serve the `app/` folder over HTTP (a PWA needs `http://`, not a `file://` path):

   ```bash
   # from the repo root
   python -m http.server 8150 --directory app
   ```

   Any static server works (`npx serve`, nginx, etc.) — the app has **no build step** and no external CDNs.
   You can also use the Claude Code preview (`.claude/launch.json`, name `ongigil-app`, port 8150).

2. Open **http://localhost:8150/** on a phone or desktop browser.
3. Turn your **sound on**, then press the big **"안내 시작"** (Start guidance) button.
4. The demo picks a seeded spot and starts a **simulated walk** toward it. You will hear, and see:
   - a **direction** in words — e.g. "북동쪽" (north-east);
   - the **distance** spoken and **counted down** near the end — "50 m … 30 m … 20 m … 앞에 있습니다";
   - **"가까워지고 있어요 / 멀어지고 있어요"** (getting closer / farther) as the position moves.
5. On "arrival" you'll be prompted to mark **taken** or **not there**.

> **Hosted version:** once the operator enables GitHub Pages, the same demo is at
> `https://clsoftlab-lang.github.io/ongigil/app/` — share that link to let anyone hear it.

Demo mode never contacts a server and stores nothing — it exists purely so you can experience the voice.

---

## B. The app against the real backend

**1. Start the backend (no keys):**

```bash
cd backend
pip install -e ".[dev]"
# entry point per backend/README.md (as populated), e.g.:
uvicorn ongigil.main:app --reload
```

The API is a small, stateless FastAPI service backed by SQLite. It exposes report / nearby / feedback /
expire and the `Directions` interface (homing default, provider stub). It runs with **no keys**.

**2. Point the app at it and open the app** (serve `app/` as in section A). As a reporter, tap
**"여기 폐지 있어요"** to save a spot at your GPS location; as a collector, tap **"안내 시작"** to be
guided by voice to the nearest open spot.

---

## What you should observe

- **Reporter → spot:** one tap saves an approximate spot (the precise coordinate is coarsened before it
  is shared — see [04 · Privacy & dignity](04-privacy-and-dignity.md)).
- **Collector → voice loop:** direction + distance, spoken and repeated as you (or the simulator) move.
- **Freshness:** spots expire on their own; "taken / not there" feedback keeps the list honest.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| No voice at all | Browser blocks speech until a tap | Press "안내 시작" (a user gesture) first; unmute the device |
| "Location unavailable" | Geolocation permission denied, or `file://` | Allow location; serve over `http://` / `https://` |
| No turn directions, only "closer/farther" | Compass (Device Orientation) not available/allowed | Expected fallback — see [03 · Voice guidance](03-voice-guidance.md) |
| Screen dims mid-guidance | Wake Lock unsupported on that browser | Keep the screen awake manually; see [06 · Deploy & limits](06-deploy-and-limits.md) |

Next: [02 · Data model](02-data-model.md) · [03 · Voice guidance](03-voice-guidance.md)
