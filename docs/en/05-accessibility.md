> Part of 온기길 · CC BY 4.0 · © 2026 CLSOFTLAB, Dr. Lee Il-guk

# 05 · Accessibility — elderly-first design

The users are often in their **70s–80s**, on their feet all day, sometimes with tired eyes and little
smartphone habit. Accessibility here is not a checklist bolted on at the end — it **is** the design.
Everything bends to them (design spec §1, §7).

The single rule: **ears, not eyes.** If a collector could not use their eyes at all, they should still be
able to be guided to recyclables. The screen is a bonus, not a requirement.

---

## What was done

| Principle | In the app |
|---|---|
| **Voice-first** | Direction + distance are **spoken** and repeated; a collector can work hands-free by ear ([03 · Voice guidance](03-voice-guidance.md)) |
| **One big button** | The collector's main screen is one large **"안내 시작"** button — no menus to get lost in |
| **Giant text** | Large, high-contrast type throughout; an adjustable text size in Settings |
| **High contrast** | Strong foreground/background contrast; no thin grey-on-grey |
| **Big touch targets** | Large rows and buttons, generous spacing — easy for imprecise taps |
| **Plain words** | Short, simple Korean; no jargon, no English-only labels on core actions |
| **Always-visible "그만"** | A big **Stop** button is on screen throughout guidance |
| **Calm speech** | Short sentences, adjustable rate, mute and repeat — never a wall of talk |
| **Helper setup** | A family member or social worker can set voice, speed and text size **once**, so the collector only ever presses one button |
| **Fewer permissions** | Works with just location; compass and wake-lock degrade gracefully if unavailable |
| **Missing-voice fallback** | If a preferred voice is unavailable, guidance still speaks with a default voice rather than going silent |

---

## Screens, kept simple

- **Collector:** big "안내 시작" → a short list of nearest spots (big rows: direction arrow, distance,
  "안내") → the **guidance screen** (giant arrow + distance, big **도착 / 여기 없어요 / 그만** buttons; voice
  throughout; a persistent "keep the screen on" note). A "가까운 곳 소리로" quick action reads the nearest
  spot aloud immediately.
- **Reporter:** one screen — a big **"여기 폐지 있어요"** button; optional quick chips (양 적음/보통/많음,
  종류, 언제까지); a warm confirmation.
- **Helper:** report on behalf; set a collector's preferences; a simple how-to.

---

## How to test with real users

Accessibility is proven with people, not assumptions. A suggested, respectful protocol:

1. **Recruit through a community centre** or a social worker who already has trust — never approach
   vulnerable elderly people cold. (See "For communities & social workers" in the README.)
2. **Explain plainly and get consent**: what it does, that it's free, that nothing is tracked or sold,
   and that they can stop anytime.
3. **Observe the one-button path first.** Can they start guidance and follow the voice **without looking
   at the screen**? Watch where they hesitate.
4. **Listen to the voice with them.** Is it loud enough, slow enough, calm? Adjust speech rate; note any
   confusing wording.
5. **Check text and contrast** in real daylight and at night, at arm's length, with their own eyesight.
6. **Walk a real short route** (safely, with a companion) and confirm the "closer / farther" cue makes
   sense on foot.
7. **Record findings as accessibility feedback** — open an
   [Accessibility feedback issue](../../issues/new/choose). Report friction, not just praise.

Do this with dignity: the collector is the expert on their own day. We are testing the app, not them.

---

## Known gaps (honest)

- **Screen-off voice** is not reliable in a web app — the screen is kept on in v0.1; a native app is the
  path to true screen-off ([06 · Deploy & limits](06-deploy-and-limits.md)).
- **Compass availability** varies by device; guidance falls back to movement-based direction.
- Multi-language voices and deeper community-centre tooling are planned (design spec §10, P2).
