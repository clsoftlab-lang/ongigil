# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
"""Directions router: homing route (no key) or provider stub (501 until keyed)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ..geo import LatLon
from ..schemas import DirectionsOut
from ..services.directions import ProviderNotConfigured, get_directions

router = APIRouter(prefix="/directions", tags=["directions"])


@router.get("/route", response_model=DirectionsOut)
def route(
    from_lat: float = Query(..., ge=-90, le=90),
    from_lon: float = Query(..., ge=-180, le=180),
    to_lat: float = Query(..., ge=-90, le=90),
    to_lon: float = Query(..., ge=-180, le=180),
    lang: str = Query(default="ko"),
) -> DirectionsOut:
    """Compute a route between two coordinates.

    Default (homing): bearing + distance, no external call, no key.
    Provider mode without a configured key → 501 "provider not configured".
    """
    directions = get_directions()
    try:
        return directions.route(LatLon(from_lat, from_lon), LatLon(to_lat, to_lon), lang)
    except ProviderNotConfigured as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc
