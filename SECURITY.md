# Security Policy

Thank you for helping keep 온기길 (Ongigil) and its users safe. Because this project serves vulnerable
elderly people and handles **location information**, we take security — and **location privacy** — very
seriously.

## Please report privately

**Do not open a public issue for a security or privacy vulnerability.** A public report could put users at
risk before a fix is out.

Instead, email **security@clsoftlab.net** with:

- a description of the issue and its impact,
- steps to reproduce (or a proof of concept),
- affected component (app / backend / docs) and version or commit if known,
- any suggested fix.

If you prefer, request a secure channel first and we will arrange one.

## Location privacy is in scope

Beyond ordinary vulnerabilities, we especially want to hear about anything that could:

- **De-coarsen or reveal a precise location** that should stay approximate (`geoApprox` should never let
  someone recover `exactGeoPrivate`);
- **De-anonymise a reporter** or a collector;
- **Track a collector's movements** or reconstruct a route from stored data;
- Leak data through logs, URLs, query strings, caches, or third parties;
- Weaken the "no keys, no secrets" guarantee, or expose a committed secret.

See [docs/en/04-privacy-and-dignity.md](docs/en/04-privacy-and-dignity.md) for the privacy model these
protect.

## Our commitment

- We will **acknowledge** your report, typically within **5 business days**.
- We will keep you updated on our assessment and a fix timeline.
- We will **coordinate disclosure** with you and credit you if you wish (or keep you anonymous).
- We ask for reasonable time to fix before public disclosure.

## Safe harbour

We will not pursue or support legal action against researchers who act in good faith, avoid privacy
violations and service disruption, and give us reasonable time to respond. Please do not access, modify,
or retain other users' data, and do not run tests against real users' locations.

## Supported versions

This is an early project (v0.1). Security fixes are made against the latest `main`. There are no
long-term-support branches yet.

Thank you for protecting the people this project serves.
