# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
"""Request/response schemas (Pydantic v2).

Deliberate omission: NO outward schema carries an exact coordinate. ``SpotPublic``
exposes only ``lat``/``lon`` which are the *coarsened* values. There is no field
that could ever hold the private exact position.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from .models import FeedbackKind, SpotKind, SpotSize, SpotStatus


# --- Reporting ---------------------------------------------------------------
class SpotReportIn(BaseModel):
    """Anonymous report. No auth, no PII. GPS captured with one tap (§2)."""

    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    kind: SpotKind = SpotKind.mixed
    size: SpotSize = SpotSize.medium
    note: Optional[str] = Field(default=None, max_length=280)
    ttl_seconds: Optional[int] = Field(default=None, ge=60, le=24 * 60 * 60)


# --- Public spot view (coarsened only) ---------------------------------------
class SpotPublic(BaseModel):
    """What any user is allowed to see. ``lat``/``lon`` are COARSENED (§8)."""

    id: int
    lat: float          # coarsened
    lon: float          # coarsened
    kind: SpotKind
    size: SpotSize
    note: Optional[str]
    status: SpotStatus
    flagged: bool
    reported_at: datetime
    expires_at: datetime


class SpotNearby(SpotPublic):
    """A public spot plus homing hints computed from the caller's position."""

    distance_m: float
    bearing_deg: float
    compass: str


# --- Feedback ----------------------------------------------------------------
class FeedbackIn(BaseModel):
    kind: FeedbackKind


# --- Directions --------------------------------------------------------------
class DirectionStep(BaseModel):
    bearing_deg: float
    compass: str
    distance_m: float
    # 'closer' / 'farther' semantics are advisory for the client; see README.
    instruction: str


class DirectionsOut(BaseModel):
    mode: str                # "homing"
    steps: list[DirectionStep]
    total_distance_m: float
    note: str


# --- Users / prefs -----------------------------------------------------------
class UserPrefsIn(BaseModel):
    role: str = "collector"
    age_band: Optional[str] = None
    voice_lang: str = "ko"
    speech_rate: float = Field(default=1.0, ge=0.5, le=2.0)
    units: str = "m"


class UserPrefsOut(BaseModel):
    id: int
    role: str
    age_band: Optional[str]
    voice_lang: str
    speech_rate: float
    units: str
    created_at: datetime
