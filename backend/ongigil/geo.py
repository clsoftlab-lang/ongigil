# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
"""Geometry helpers: haversine distance, bearing, compass words, and coarsening.

**Coarsening (§8) is the privacy cornerstone.** `coarsen()` snaps a coordinate to a
grid so a shared location is only ever approximate. Exact coordinates are kept
server-side and must never be serialized outward — see ``services.serialization``,
the single choke-point that guarantees it.
"""
from __future__ import annotations

import math
from typing import NamedTuple

EARTH_RADIUS_M = 6_371_000.0

# 8-point compass in the collector's languages. Korean first (ko default, §4).
_COMPASS_KO = ["북쪽", "북동쪽", "동쪽", "남동쪽", "남쪽", "남서쪽", "서쪽", "북서쪽"]
_COMPASS_EN = ["north", "north-east", "east", "south-east",
               "south", "south-west", "west", "north-west"]


class LatLon(NamedTuple):
    lat: float
    lon: float


def haversine_m(a: LatLon, b: LatLon) -> float:
    """Great-circle distance between two points in metres."""
    lat1, lon1, lat2, lon2 = map(math.radians, (a.lat, a.lon, b.lat, b.lon))
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(min(1.0, math.sqrt(h)))


def bearing_deg(a: LatLon, b: LatLon) -> float:
    """Initial compass bearing from a → b, degrees clockwise from true north [0,360)."""
    lat1, lat2 = math.radians(a.lat), math.radians(b.lat)
    dlon = math.radians(b.lon - a.lon)
    x = math.sin(dlon) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    return (math.degrees(math.atan2(x, y)) + 360.0) % 360.0


def compass_word(bearing: float, lang: str = "ko") -> str:
    """Map a bearing to an 8-point compass word in the given language."""
    idx = int((bearing + 22.5) % 360.0 // 45.0)
    return (_COMPASS_EN if lang == "en" else _COMPASS_KO)[idx]


def meters_per_degree_lat() -> float:
    return math.pi * EARTH_RADIUS_M / 180.0  # ~111_195 m


def meters_per_degree_lon(lat: float) -> float:
    return meters_per_degree_lat() * math.cos(math.radians(lat))


def coarsen(point: LatLon, grid_m: float) -> LatLon:
    """Snap a coordinate to a ~grid_m grid so shared locations are approximate.

    The exact input is discarded from the result: the output is the centre of the
    grid cell it fell into. This is what other users are ever allowed to see; the
    precise value stays private server-side and is never returned (§8).
    """
    if grid_m <= 0:
        return point
    lat_step = grid_m / meters_per_degree_lat()
    # Longitude degrees-per-metre depends on latitude; use the snapped latitude
    # band so the grid stays stable regardless of the exact input longitude.
    snapped_lat = round(point.lat / lat_step) * lat_step
    mpd_lon = meters_per_degree_lon(snapped_lat)
    lon_step = grid_m / mpd_lon if mpd_lon > 1e-9 else 0.0
    snapped_lon = round(point.lon / lon_step) * lon_step if lon_step > 0 else point.lon
    # Round to a modest precision so we never echo the raw float back out.
    return LatLon(round(snapped_lat, 6), round(snapped_lon, 6))


def approach_word(prev_distance_m: float | None, distance_m: float, lang: str = "ko") -> str:
    """'getting closer / farther' cue so a compass-less collector knows the way (§4)."""
    if prev_distance_m is None:
        return ""
    delta = distance_m - prev_distance_m
    if abs(delta) < 3.0:  # noise floor
        return ""
    if lang == "en":
        return "getting closer" if delta < 0 else "getting farther"
    return "가까워지고 있어요" if delta < 0 else "멀어지고 있어요"
