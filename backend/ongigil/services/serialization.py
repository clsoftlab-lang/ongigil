# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
"""THE privacy choke-point.

Every Spot that leaves the API — nearby, get-by-id, report confirmation, export —
is turned into an outward schema HERE and only here. This is the single place that
reads a Spot's coordinates, and it emits only the coarsened ``approx_*`` values.
The exact ``exact_lat``/``exact_lon`` are never touched on the way out, so an exact
coordinate is structurally unable to reach a response. A test asserts this.
"""
from __future__ import annotations

from ..geo import LatLon, bearing_deg, compass_word, haversine_m
from ..models import Spot
from ..schemas import SpotNearby, SpotPublic


def spot_public(spot: Spot) -> SpotPublic:
    """Coarsened public view. Exact coordinates are intentionally not read."""
    return SpotPublic(
        id=spot.id,
        lat=spot.approx_lat,   # coarsened — never exact
        lon=spot.approx_lon,   # coarsened — never exact
        kind=spot.kind,
        size=spot.size,
        note=spot.note,
        status=spot.status,
        flagged=spot.flagged,
        reported_at=spot.reported_at,
        expires_at=spot.expires_at,
    )


def spot_nearby(spot: Spot, origin: LatLon, lang: str = "ko") -> SpotNearby:
    """Public view + homing hints. Distance/bearing are computed from the caller's
    position to the COARSENED location, so no exact-coordinate math leaks either."""
    target = LatLon(spot.approx_lat, spot.approx_lon)
    dist = haversine_m(origin, target)
    brg = bearing_deg(origin, target)
    base = spot_public(spot)
    return SpotNearby(
        **base.model_dump(),
        distance_m=round(dist, 1),
        bearing_deg=round(brg, 1),
        compass=compass_word(brg, lang),
    )
