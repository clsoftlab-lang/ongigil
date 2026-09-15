# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
"""Homing directions (no key) and the provider stub (501 without a key)."""
from __future__ import annotations

import importlib

import pytest

from .conftest import ORIGIN_LAT, ORIGIN_LON


def test_homing_route_sensible_bearing_and_distance(client):
    # Target ~200 m due north.
    r = client.get("/directions/route", params={
        "from_lat": ORIGIN_LAT, "from_lon": ORIGIN_LON,
        "to_lat": ORIGIN_LAT + 0.0018, "to_lon": ORIGIN_LON, "lang": "en",
    })
    assert r.status_code == 200
    j = r.json()
    assert j["mode"] == "homing"
    assert len(j["steps"]) == 1
    step = j["steps"][0]
    assert min(step["bearing_deg"], 360 - step["bearing_deg"]) < 5   # ~north
    assert 150 < step["distance_m"] < 250
    assert step["compass"] == "north"
    assert 150 < j["total_distance_m"] < 250


def test_homing_route_needs_no_key(client):
    # Nothing configured; still works.
    r = client.get("/directions/route", params={
        "from_lat": ORIGIN_LAT, "from_lon": ORIGIN_LON,
        "to_lat": ORIGIN_LAT, "to_lon": ORIGIN_LON + 0.004,
    })
    assert r.status_code == 200
    assert r.json()["mode"] == "homing"


def test_provider_stub_returns_501_without_key(monkeypatch):
    """Switch to provider mode via env, no key → 501 provider not configured."""
    monkeypatch.setenv("ONGIGIL_DIRECTIONS", "provider")
    monkeypatch.setenv("ONGIGIL_DIRECTIONS_PROVIDER_KEY", "")

    import ongigil.config as config
    config.get_settings.cache_clear()  # pick up the env change

    # Rebuild the app so the router uses the refreshed settings.
    import ongigil.main as main
    importlib.reload(main)
    from fastapi.testclient import TestClient

    with TestClient(main.app) as tc:
        r = tc.get("/directions/route", params={
            "from_lat": ORIGIN_LAT, "from_lon": ORIGIN_LON,
            "to_lat": ORIGIN_LAT + 0.001, "to_lon": ORIGIN_LON,
        })
        assert r.status_code == 501
        assert "provider not configured" in r.json()["detail"]

    # Restore default settings for the rest of the suite.
    config.get_settings.cache_clear()
    importlib.reload(main)
