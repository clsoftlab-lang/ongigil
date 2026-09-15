> Part of 온기길 · CC BY 4.0 · © 2026 CLSOFTLAB, Dr. Lee Il-guk

# 03 · Voice guidance — the homing model

This is the heart of 온기길. The default mode needs **no map API and no keys**: it uses only the browser's
**Geolocation** (position) and, where available, **Device Orientation** (compass heading). The app
computes the bearing and distance to the target spot and **speaks** them, repeating as the collector
moves. Based on the design spec §4.

The guiding idea: a collector should be able to walk toward recyclables **by ear alone**, hands on the
cart, calm short sentences, never a wall of talk.

---

## The loop, step by step

```
  target spot (geoApprox)                        collector's phone
  ───────────────────────                        ─────────────────
                                    ┌── Geolocation → current position
                                    ├── Device Orientation → heading (if available)
                                    ▼
      bearing + distance  ◄──────  compute from (current position → target)
            │
            ├─ bearing → compass words ("북동쪽")
            ├─ heading + bearing → relative turn ("오른쪽으로 도세요")
            ├─ distance → callouts + countdown ("50 m … 20 m")
            ├─ distance trend → "가까워지고 있어요 / 멀어지고 있어요"
            └─ within threshold → "거의 다 왔어요" → "도착했어요"
                    │
                    ▼   spoken via speechSynthesis (Korean voice), then repeat as they move
```

---

## 1. Bearing → compass words

The bearing from the collector to the spot (0°=N, 90°=E, 180°=S, 270°=W) is mapped to an **8-point
compass** word in the user's language:

| Bearing (°) | Word (ko) | (en) |
|---|---|---|
| 337.5–22.5 | 북쪽 | north |
| 22.5–67.5 | 북동쪽 | north-east |
| 67.5–112.5 | 동쪽 | east |
| 112.5–157.5 | 남동쪽 | south-east |
| 157.5–202.5 | 남쪽 | south |
| 202.5–247.5 | 남서쪽 | south-west |
| 247.5–292.5 | 서쪽 | west |
| 292.5–337.5 | 북서쪽 | north-west |

Compass words always work, because bearing needs only two positions — no heading required.

---

## 2. Heading + bearing → relative turns

When the compass **heading** is available, the app turns the absolute bearing into a **relative turn** —
what the collector actually feels while walking. Let `relative = (bearing − heading + 360) mod 360`:

| `relative` (°) | Spoken (ko) | Meaning |
|---|---|---|
| 350–360 / 0–10 | 앞으로 곧장 | straight ahead |
| 10–45 | 오른쪽 앞으로 | ahead and to the right |
| 45–135 | 오른쪽으로 도세요 | turn right |
| 135–225 | 뒤로 돌아서세요 | turn around |
| 225–315 | 왼쪽으로 도세요 | turn left |
| 315–350 | 왼쪽 앞으로 | ahead and to the left |

This is the "left a bit / right a bit" feel Dr. Lee asked for — produced from **heading + bearing, no
map**. Small changes are debounced so the app doesn't chatter on every wobble.

---

## 3. Distance callouts & countdown

Distance is spoken at **sensible thresholds**, not continuously:

- On meaningful change (roughly every **~20 m**), so the collector hears progress without noise.
- A **countdown under 50 m**: "50 m … 30 m … 20 m … 앞에 있습니다."
- Always paired with the **trend**: **"가까워지고 있어요"** (getting closer) or **"멀어지고 있어요"**
  (getting farther). The trend is what lets a collector **without a compass** still know they chose the
  right direction — if it says "farther," turn around.

---

## 4. Arrival

| Distance | Spoken | Then |
|---|---|---|
| within ~15 m | 거의 다 왔어요 | keep guiding |
| within ~8 m | 도착했어요 | prompt **taken** / **not there** |

---

## 5. Speech

- Web Speech API **`speechSynthesis`**, a **Korean** voice by default (English available).
- **Adjustable rate** (a helper can slow it down in Settings).
- Sentences are **short, calm, respectful** — never a paragraph. A **mute** and a **repeat** button are
  always available.

---

## 6. No compass? (fallback)

Many phones — and iOS in particular — need a permission for Device Orientation, and some devices lack a
usable compass. When heading is unavailable, the app **infers heading from movement**: comparing
consecutive GPS points while walking gives a course. Guidance then still speaks **direction + "closer /
farther"**; it simply leans more on the trend than on turn-by-turn wording.

---

## 7. Optional precise turn-by-turn (upgrade)

The homing model is deliberately provider-free. If an operator later adds a **walking-directions
provider key**, guidance can switch to **street turn-by-turn**.

- There is a `Directions` interface: `route(from, to) -> steps[]`.
- It ships with **`HomingDirections`** (compass/GPS, no key — the default) and a **stub** for a real
  provider (e.g. Kakao / Naver / Google walking API).
- The provider key is **env/config only**, added by whoever runs the service. **No key is committed to
  this repo**, and the free homing mode always works. See [06 · Deploy & limits](06-deploy-and-limits.md)
  for how to add one.

---

## Tuning summary (defaults)

| Parameter | Default |
|---|---|
| Distance re-announce interval | ~20 m of change |
| Countdown starts at | 50 m |
| "Almost there" | ~15 m |
| "Arrived" | ~8 m |
| Turn debounce | small heading changes suppressed |

These are advisory defaults from §4 and can be adjusted by an operator; the exact constants live with the
app as its README is populated.
