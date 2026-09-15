# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
"""Spots router: report (anon), nearby, get-by-id, feedback, expiry sweep.

Every response is built through ``services.serialization`` so only coarsened
locations ever leave the API.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from ..config import get_settings
from ..db import get_session
from ..geo import LatLon
from ..schemas import FeedbackIn, SpotNearby, SpotPublic, SpotReportIn
from ..services import spots as spot_service
from ..services.serialization import spot_nearby, spot_public

router = APIRouter(prefix="/spots", tags=["spots"])


@router.post("", response_model=SpotPublic, status_code=201)
def report_spot(payload: SpotReportIn, session: Session = Depends(get_session)) -> SpotPublic:
    """Anonymous one-tap report. No auth. Returns the COARSENED spot (never exact)."""
    spot = spot_service.create_spot(
        session,
        lat=payload.lat,
        lon=payload.lon,
        kind=payload.kind,
        size=payload.size,
        note=payload.note,
        ttl_seconds=payload.ttl_seconds,
    )
    return spot_public(spot)


@router.get("/nearby", response_model=list[SpotNearby])
def nearby_spots(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_m: float | None = Query(default=None, gt=0),
    limit: int | None = Query(default=None, gt=0),
    lang: str = Query(default="ko"),
    session: Session = Depends(get_session),
) -> list[SpotNearby]:
    """Open, non-expired spots within radius, coarsened, sorted nearest-first,
    with bearing/distance from the caller's position."""
    settings = get_settings()
    r = min(radius_m or settings.nearby_default_radius_m, settings.nearby_max_radius_m)
    lim = min(limit or settings.nearby_max_results, settings.nearby_max_results)
    origin = LatLon(lat, lon)
    results = spot_service.nearby(session, origin, r, lim)
    return [spot_nearby(spot, origin, lang) for spot, _dist in results]


@router.get("/{spot_id}", response_model=SpotPublic)
def get_spot(spot_id: int, session: Session = Depends(get_session)) -> SpotPublic:
    spot = spot_service.get_spot(session, spot_id)
    if spot is None:
        raise HTTPException(status_code=404, detail="spot not found")
    return spot_public(spot)


@router.post("/{spot_id}/feedback", response_model=SpotPublic)
def feedback(
    spot_id: int, payload: FeedbackIn, session: Session = Depends(get_session)
) -> SpotPublic:
    """taken | gone | bad → updates status (bad also flags for moderation)."""
    spot = spot_service.get_spot(session, spot_id)
    if spot is None:
        raise HTTPException(status_code=404, detail="spot not found")
    spot_service.add_feedback(session, spot, payload.kind)
    return spot_public(spot)


@router.post("/maintenance/expire", tags=["admin"])
def sweep_expired(session: Session = Depends(get_session)) -> dict[str, int]:
    """Run the TTL expiry sweep explicitly (also runs lazily on every nearby)."""
    return {"expired": spot_service.expire_stale(session)}
