# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
"""Report → nearby happy path, sorting, bearing, feedback hiding."""
from __future__ import annotations

import math

from .conftest import ORIGIN_LAT, ORIGIN_LON


def _report(client, lat, lon, **kw):
    body = {"lat": lat, "lon": lon}
    body.update(kw)
    r = client.post("/spots", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def test_health_no_keys(client):
    r = client.get("/health")
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "ok"
    assert j["keys_required"] is False
    assert j["directions_mode"] == "homing"


def test_anonymous_report_needs_no_auth(client):
    # No Authorization header, no cookie — a bare POST succeeds.
    r = client.post("/spots", json={"lat": ORIGIN_LAT, "lon": ORIGIN_LON})
    assert r.status_code == 201
    body = r.json()
    # Response carries no reporter identity / PII.
    assert "reporter_ref" not in body
    assert "exact_lat" not in body and "exact_lon" not in body


def test_report_then_nearby_sorted_and_bearing(client):
    # A spot due north (~200 m) and one due east (~400 m) of the origin.
    north = _report(client, ORIGIN_LAT + 0.0018, ORIGIN_LON)          # ~200 m N
    east = _report(client, ORIGIN_LAT, ORIGIN_LON + 0.0045)           # ~400 m E
    assert north["id"] != east["id"]

    r = client.get("/spots/nearby", params={"lat": ORIGIN_LAT, "lon": ORIGIN_LON, "lang": "en"})
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 2

    # Sorted nearest-first.
    assert items[0]["distance_m"] <= items[1]["distance_m"]

    by_id = {i["id"]: i for i in items}
    n = by_id[north["id"]]
    e = by_id[east["id"]]
    # North bearing ~0/360, east bearing ~90 — within tolerance (coarsening jitter).
    assert min(n["bearing_deg"], 360 - n["bearing_deg"]) < 20
    assert abs(e["bearing_deg"] - 90) < 20
    assert n["compass"] in ("north", "north-east", "north-west")
    assert e["compass"] in ("east", "north-east", "south-east")
    # Distances are plausible.
    assert 120 < n["distance_m"] < 320
    assert 300 < e["distance_m"] < 520


def test_nearby_radius_excludes_far_spots(client):
    _report(client, ORIGIN_LAT, ORIGIN_LON + 0.05)  # ~4.4 km east
    r = client.get("/spots/nearby", params={"lat": ORIGIN_LAT, "lon": ORIGIN_LON, "radius_m": 500})
    assert r.status_code == 200
    assert r.json() == []


def test_feedback_taken_hides_spot(client):
    s = _report(client, ORIGIN_LAT + 0.001, ORIGIN_LON)
    assert len(client.get("/spots/nearby", params={"lat": ORIGIN_LAT, "lon": ORIGIN_LON}).json()) == 1
    r = client.post(f"/spots/{s['id']}/feedback", json={"kind": "taken"})
    assert r.status_code == 200
    assert r.json()["status"] == "taken"
    # Gone from nearby.
    assert client.get("/spots/nearby", params={"lat": ORIGIN_LAT, "lon": ORIGIN_LON}).json() == []


def test_feedback_gone_hides_spot(client):
    s = _report(client, ORIGIN_LAT + 0.001, ORIGIN_LON)
    client.post(f"/spots/{s['id']}/feedback", json={"kind": "gone"})
    assert client.get("/spots/nearby", params={"lat": ORIGIN_LAT, "lon": ORIGIN_LON}).json() == []


def test_feedback_bad_flags_for_moderation(client):
    s = _report(client, ORIGIN_LAT + 0.001, ORIGIN_LON)
    r = client.post(f"/spots/{s['id']}/feedback", json={"kind": "bad"})
    assert r.status_code == 200
    body = r.json()
    assert body["flagged"] is True
    assert body["status"] == "gone"
    # Removed from circulation.
    assert client.get("/spots/nearby", params={"lat": ORIGIN_LAT, "lon": ORIGIN_LON}).json() == []


def test_get_spot_and_404(client):
    s = _report(client, ORIGIN_LAT, ORIGIN_LON)
    assert client.get(f"/spots/{s['id']}").status_code == 200
    assert client.get("/spots/999999").status_code == 404
