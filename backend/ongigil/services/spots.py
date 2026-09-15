# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
"""Spot lifecycle service: report, nearby, feedback, expiry sweep, moderation.

Lifecycle: open → taken | gone | expired.
  - open      : live, returned by nearby.
  - taken     : a collector took it (feedback taken) → hidden from nearby.
  - gone      : not there / no longer present (feedback gone) → hidden.
  - expired   : TTL passed → hidden (swept lazily and by the sweep helper).
"""
from __future__ import annotations

import secrets
from datetime import timedelta
from typing import Optional

from sqlmodel import Session, select

from ..config import get_settings
from ..geo import LatLon, coarsen, haversine_m
from ..models import (
    Feedback,
    FeedbackKind,
    Spot,
    SpotKind,
    SpotSize,
    SpotStatus,
    utcnow,
)


def create_spot(
    session: Session,
    lat: float,
    lon: float,
    kind: SpotKind = SpotKind.mixed,
    size: SpotSize = SpotSize.medium,
    note: Optional[str] = None,
    ttl_seconds: Optional[int] = None,
) -> Spot:
    """Store a report. Exact coords kept private; coarsened copy computed once."""
    settings = get_settings()
    ttl = ttl_seconds if ttl_seconds is not None else settings.spot_ttl_seconds
    approx = coarsen(LatLon(lat, lon), settings.coarsen_grid_m)
    now = utcnow()
    spot = Spot(
        exact_lat=lat,
        exact_lon=lon,
        approx_lat=approx.lat,
        approx_lon=approx.lon,
        kind=kind,
        size=size,
        note=note,
        status=SpotStatus.open,
        reported_at=now,
        expires_at=now + timedelta(seconds=ttl),
        reporter_ref=secrets.token_hex(8),  # opaque, anonymous
    )
    session.add(spot)
    session.commit()
    session.refresh(spot)
    return spot


def expire_stale(session: Session) -> int:
    """Sweep: mark open spots whose TTL passed as expired. Returns count changed."""
    now = utcnow()
    stale = session.exec(
        select(Spot).where(Spot.status == SpotStatus.open, Spot.expires_at < now)
    ).all()
    for spot in stale:
        spot.status = SpotStatus.expired
        session.add(spot)
    if stale:
        session.commit()
    return len(stale)


def get_spot(session: Session, spot_id: int) -> Optional[Spot]:
    return session.get(Spot, spot_id)


def nearby(
    session: Session,
    origin: LatLon,
    radius_m: float,
    limit: int,
) -> list[tuple[Spot, float]]:
    """Return (spot, distance_m) for OPEN, non-expired spots within radius,
    sorted nearest-first. Distance uses the coarsened location so nothing exact
    leaks. Expiry is swept first so stale spots never appear."""
    expire_stale(session)
    candidates = session.exec(select(Spot).where(Spot.status == SpotStatus.open)).all()
    scored: list[tuple[Spot, float]] = []
    for spot in candidates:
        dist = haversine_m(origin, LatLon(spot.approx_lat, spot.approx_lon))
        if dist <= radius_m:
            scored.append((spot, dist))
    scored.sort(key=lambda t: t[1])
    return scored[:limit]


def add_feedback(session: Session, spot: Spot, kind: FeedbackKind) -> Feedback:
    """Record feedback and advance the spot's status honestly."""
    fb = Feedback(spot_id=spot.id, kind=kind)
    session.add(fb)
    if kind == FeedbackKind.taken:
        spot.status = SpotStatus.taken
    elif kind == FeedbackKind.gone:
        spot.status = SpotStatus.gone
    elif kind == FeedbackKind.bad:
        # Moderation: flag as unsafe/wrong and remove from circulation (§7).
        spot.flagged = True
        spot.status = SpotStatus.gone
    session.add(spot)
    session.commit()
    session.refresh(spot)
    session.refresh(fb)
    return fb
