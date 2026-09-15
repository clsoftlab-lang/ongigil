> Part of 온기길 · CC BY 4.0 · © 2026 CLSOFTLAB, Dr. Lee Il-guk

# 04 · Privacy & dignity

온기길 handles two sensitive things: **where recyclables (and therefore people) are**, and **the
livelihood of vulnerable elderly users**. Both deserve care. This page explains what we protect, how,
and why. Based on the design spec §8.

**One sentence:** we share the least location we can, keep people anonymous, never track collectors, and
speak about everyone with respect.

---

## 1. Locations are coarsened before they are shared

- When a spot is reported, the precise coordinate is kept **server-side only** (`exactGeoPrivate`) and is
  **coarsened** — snapped to a grid (~75 m by default, `ONGIGIL_COARSEN_GRID_M`) — into `geoApprox`
  **before it is shared** with anyone. The backend enforces this at a single choke-point so no outward
  response even has a field for the exact position.
- Other users, including collectors, ever see only the **approximate** location.
- Coarsening is enough to walk toward with voice guidance (direction + distance homes in the last few
  metres) while not pinpointing a specific home, bin, or shopfront.

**Why:** an exact pin could reveal that a particular household or shop puts out recyclables, on a
schedule — that is nobody else's business. Approximate is kind and sufficient.

---

## 2. Reporters are anonymous

- No name, no face, no exact home address is required to report.
- A spot carries only an **anonymous reference** (`reporterRef`), enough to rate-limit abuse, not to
  identify a person.

---

## 3. Collectors are not tracked

- Guidance uses your position **live**, on your device, to compute direction and distance. It is **not
  stored long-term** — a `GuidanceSession` is transient.
- There is **no history of where a collector walked**, no route log, no profile built from movement.
- Any optional profile (voice language, speech rate, units) is minimal and stays on the user's terms.

**Why:** the people this serves already have little privacy in their working day. The app must not become
one more thing that watches them.

---

## 4. Export & delete

- Users can **export** their data and **delete** it. There is nothing hidden to retain.
- Because so little is stored, deletion is simple and complete.

---

## 5. Respectful language — dignity is a feature

Every string a user reads or hears is written to be **respectful and warm**:

- This is framed as **neighbours sharing information**, never as charity or pity.
- The reporter's confirmation is a plain **"고맙습니다 — this helps someone's day,"** not "you helped a
  poor person."
- Collectors are addressed as capable people doing a job, in calm, courteous Korean.

Wording is part of the product. A pull request that adds a demeaning or pitying phrase will be treated as
a bug. See [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) and [05 · Accessibility](05-accessibility.md).

---

## 6. No money, no ads, no data sale

- **Nothing is sold** or shared with third parties.
- **No ads.**
- No payment ever changes hands inside 온기길 — it is pure information sharing for social good.

---

## Summary table

| We protect | How |
|---|---|
| Where a household/shop puts recyclables | Coarsened `geoApprox`; exact coord server-side only, never shared |
| Who reported | Anonymous `reporterRef`; no name/face/address |
| Where a collector goes | Live-only positions; no long-term track; export/delete |
| A person's dignity | Respectful, warm wording; framed as neighbourly help |
| Everyone from exploitation | No ads, no data sale, no third-party sharing |

If you find a privacy weakness — especially anything that could de-anonymise a location or a person —
please report it privately: see [SECURITY.md](../../SECURITY.md).
