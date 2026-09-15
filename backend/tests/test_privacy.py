# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
"""THE privacy guarantee: an exact reported coordinate is NEVER present in any
API response, and coarsening actually moves the point."""
from __future__ import annotations

from ongigil.config import get_settings
from ongigil.geo import LatLon, coarsen

from .conftest import ORIGIN_LAT, ORIGIN_LON

# Deliberately off-grid, high-precision coordinates that no grid cell centre hits.
EXACT_LAT = 37.5661234
EXACT_LON = 126.9789876


def test_coarsen_moves_the_point():
    grid = get_settings().coarsen_grid_m
    exact = LatLon(EXACT_LAT, EXACT_LON)
    approx = coarsen(exact, grid)
    # The coarsened value is different from the exact input...
    assert (approx.lat, approx.lon) != (exact.lat, exact.lon)
    # ...but still nearby (within ~ one grid cell diagonal).
    from ongigil.geo import haversine_m

    assert haversine_m(exact, approx) < grid * 1.5


def test_exact_coordinates_never_round_trip(client):
    # Report at exact off-grid coords.
    r = client.post("/spots", json={"lat": EXACT_LAT, "lon": EXACT_LON})
    assert r.status_code == 201
    spot = r.json()
    spot_id = spot["id"]

    exact_lat_str = repr(EXACT_LAT)   # "37.5661234"
    exact_lon_str = repr(EXACT_LON)   # "126.9789876"

    # Collect the raw text of every endpoint that could expose a location.
    responses = [
        r.text,                                                     # report confirmation
        client.get(f"/spots/{spot_id}").text,                       # get-by-id
        client.get("/spots/nearby",
                   params={"lat": ORIGIN_LAT, "lon": ORIGIN_LON, "radius_m": 5000}).text,
    ]
    for text in responses:
        assert exact_lat_str not in text, f"exact lat leaked in: {text}"
        assert exact_lon_str not in text, f"exact lon leaked in: {text}"

    # The returned lat/lon are the coarsened ones and differ from the exact input.
    assert spot["lat"] != EXACT_LAT
    assert spot["lon"] != EXACT_LON

    # And no outward schema even has a field named exact_*.
    assert "exact_lat" not in spot and "exact_lon" not in spot


def test_nearby_carries_only_coarsened_fields(client):
    client.post("/spots", json={"lat": EXACT_LAT, "lon": EXACT_LON})
    item = client.get("/spots/nearby",
                      params={"lat": ORIGIN_LAT, "lon": ORIGIN_LON, "radius_m": 5000}).json()[0]
    assert set(item).issuperset({"lat", "lon", "distance_m", "bearing_deg", "compass"})
    assert "exact_lat" not in item and "exact_lon" not in item
    assert "reporter_ref" not in item
