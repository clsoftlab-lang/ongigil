# Contributing to 온기길 (Ongigil)

Thank you for wanting to help. 온기길 exists to make one small thing kinder: helping elderly people who
collect recyclable paper find it more easily, by ear, with dignity. Every contribution is welcome when it
keeps that spirit.

> **First, the heart of it:** this serves vulnerable elderly users. **Kindness, privacy, safety, and
> accessibility come before cleverness or features.** A change that makes the app faster but colder,
> or more capable but less private, is not an improvement here.

Please also read the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Ways to contribute (you don't have to code)

- **Accessibility feedback** — the most valuable of all. Tried it with an elderly user, or are one? Tell us
  what was hard: text too small, voice too fast, a confusing word. Open an *Accessibility feedback* issue.
- **Voice / wording** — better, warmer, clearer Korean (or another language). Wording is a feature here.
- **Community partnership** — a community centre or social worker who could help test or roll out? Open a
  *Community-partner inquiry*.
- **Report a bug** or **suggest an idea** — use the issue templates.
- **Safety** — flag an unsafe spot pattern or a safety gap.
- **Code & docs** — app, backend, or documentation improvements.

Start from [issue templates](.github/ISSUE_TEMPLATE/) or a [Discussion](../../discussions).

---

## Ground rules

1. **Dignity in every string.** No pitying, demeaning, or infantilising language, anywhere a user reads or
   hears it. Frame everything as neighbours sharing information.
2. **Privacy by default.** Never weaken location coarsening, never expose a precise coordinate, never add
   tracking of collectors, never add analytics that phone home. See
   [docs/en/04-privacy-and-dignity.md](docs/en/04-privacy-and-dignity.md).
3. **No keys, no secrets in the repo.** The default homing mode must keep working with **no keys**. Any
   provider key is env/config only and never committed.
4. **Be honest about limits.** Don't describe the PWA as doing screen-off background voice — it doesn't
   (see [docs/en/06-deploy-and-limits.md](docs/en/06-deploy-and-limits.md)). Don't overstate.
5. **Accessibility is not optional.** Keep giant text, high contrast, big touch targets, one-button flows,
   and voice-first behaviour intact.
6. **The spec leads.** [docs/en/00-design-spec.md](docs/en/00-design-spec.md) is the source of truth. If a
   change alters behaviour, update the spec first, then the code.
7. **No ads, no data sale, no payments.** Ever.

---

## Development setup

**Backend (Python 3.11+, FastAPI + SQLite, no keys):**

```bash
cd backend
pip install -e ".[dev]"
# run the API (entry point per backend/README.md as populated), e.g.:
uvicorn ongigil.main:app --reload
```

**App (PWA, no build step, no keys):**

```bash
# from the repo root
python -m http.server 8150 --directory app
# open http://localhost:8150/  → demo mode you can hear
```

See [docs/en/01-quickstart.md](docs/en/01-quickstart.md).

---

## Tests & CI

Continuous integration runs on every push and pull request:

- **Backend:** installed with `pip install -e "backend[dev]"` on Python 3.11 and 3.12; if
  `backend/tests/` contains `test_*.py`, `pytest` runs.
- **App:** on Node 20; if `app/tests/` contains test files, `node --test` runs them (as a **file glob**,
  e.g. `app/tests/*.test.js`).
- **Sanity:** YAML / JSON / HTML in the repo are parsed.

Each job is guarded to pass cleanly when a folder has no tests yet, so the pipeline stays green as the app
and backend are built out. Please add tests with your change where it makes sense — especially for the
voice-guidance maths and location coarsening.

---

## Pull requests

- Keep PRs focused and small where you can.
- Fill in the [pull request template](.github/PULL_REQUEST_TEMPLATE.md) — including the privacy,
  accessibility, and honesty checkboxes.
- If you touched user-facing wording, note how it stays respectful and warm.
- If behaviour changed, confirm the spec/docs were updated.

By contributing you agree your code is licensed **Apache-2.0** and your docs **CC BY 4.0**.

Questions? Open a [Discussion](../../discussions). Thank you for helping build a warm path. 🕊️
