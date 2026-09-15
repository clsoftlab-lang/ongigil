# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
"""Seed a handful of demo spots near the configured origin so the API and the PWA
demo work immediately — no keys, no manual data entry.

Run:  python seed.py
"""
from __future__ import annotations

from ongigil.config import get_settings
from ongigil.db import create_db_and_tables, engine
from ongigil.models import SpotKind, SpotSize
from ongigil.services import spots as spot_service
from sqlmodel import Session

# Small offsets (~degrees) around the demo origin so spots land within a few
# hundred metres — close enough to appear in a default nearby query.
_DEMO = [
    (0.0009, 0.0011, SpotKind.cardboard, SpotSize.large, "가게 앞 박스 많이 나왔어요"),
    (-0.0006, 0.0004, SpotKind.paper, SpotSize.medium, "신문지 묶음"),
    (0.0013, -0.0008, SpotKind.mixed, SpotSize.small, "조금 있어요"),
    (-0.0011, -0.0013, SpotKind.cardboard, SpotSize.medium, "택배 상자"),
    (0.0004, 0.0018, SpotKind.paper, SpotSize.large, "이사 나가면서 종이 많이"),
]


def seed() -> int:
    settings = get_settings()
    create_db_and_tables()
    olat, olon = settings.region_default_lat, settings.region_default_lon
    count = 0
    with Session(engine) as session:
        for dlat, dlon, kind, size, note in _DEMO:
            spot_service.create_spot(
                session,
                lat=olat + dlat,
                lon=olon + dlon,
                kind=kind,
                size=size,
                note=note,
            )
            count += 1
    return count


if __name__ == "__main__":
    n = seed()
    s = get_settings()
    print(f"Seeded {n} demo spots near ({s.region_default_lat}, {s.region_default_lon}).")
    print("Start the API:  uvicorn ongigil.main:app --reload")
