# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
"""TTL expiry removes stale spots from nearby (no real sleep needed)."""
from __future__ import annotations

from datetime import timedelta

from sqlmodel import Session

from ongigil.db import engine
from ongigil.models import Spot, SpotStatus, utcnow
from ongigil.services import spots as spot_service

from .conftest import ORIGIN_LAT, ORIGIN_LON


def _insert_expired(lat, lon):
    """Insert a spot that already expired a minute ago."""
    with Session(engine) as s:
        spot = Spot(
            exact_lat=lat, exact_lon=lon, approx_lat=lat, approx_lon=lon,
            status=SpotStatus.open,
            reported_at=utcnow() - timedelta(hours=5),
            expires_at=utcnow() - timedelta(minutes=1),
        )
        s.add(spot)
        s.commit()
        s.refresh(spot)
        return spot.id


def test_expired_spot_absent_from_nearby(client):
    _insert_expired(ORIGIN_LAT + 0.0005, ORIGIN_LON)
    # A live one for contrast.
    client.post("/spots", json={"lat": ORIGIN_LAT + 0.0006, "lon": ORIGIN_LON})

    items = client.get("/spots/nearby", params={"lat": ORIGIN_LAT, "lon": ORIGIN_LON}).json()
    assert len(items) == 1  # only the live one


def test_expiry_sweep_marks_status(client):
    sid = _insert_expired(ORIGIN_LAT, ORIGIN_LON)
    r = client.post("/spots/maintenance/expire")
    assert r.status_code == 200
    assert r.json()["expired"] >= 1
    # Status is now expired.
    with Session(engine) as s:
        assert s.get(Spot, sid).status == SpotStatus.expired
