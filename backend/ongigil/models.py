# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
"""Persistence models (SQLModel / SQLite).

Privacy note: ``Spot`` stores the exact coordinate (``exact_lat``/``exact_lon``)
server-side because we need it to snap onto a grid, but those columns are NEVER
placed on any outward schema. All outward serialization goes through
``services.serialization.spot_public`` which emits only the coarsened location.
"""
from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SpotStatus(str, enum.Enum):
    open = "open"
    taken = "taken"
    gone = "gone"
    expired = "expired"


class SpotKind(str, enum.Enum):
    paper = "paper"
    cardboard = "cardboard"
    mixed = "mixed"


class SpotSize(str, enum.Enum):
    small = "small"
    medium = "medium"
    large = "large"


class FeedbackKind(str, enum.Enum):
    taken = "taken"
    gone = "gone"          # "not there" — recyclables no longer present
    bad = "bad"            # unsafe/wrong report → moderation flag


class Spot(SQLModel, table=True):
    __tablename__ = "spot"

    id: Optional[int] = Field(default=None, primary_key=True)

    # --- Exact location: PRIVATE, server-side only, never serialized out ------
    exact_lat: float
    exact_lon: float
    # --- Coarsened location: the only location ever shared (§8) ---------------
    approx_lat: float
    approx_lon: float

    kind: SpotKind = Field(default=SpotKind.mixed)
    size: SpotSize = Field(default=SpotSize.medium)
    note: Optional[str] = Field(default=None, max_length=280)

    status: SpotStatus = Field(default=SpotStatus.open, index=True)
    flagged: bool = Field(default=False)  # moderation flag for unsafe/bad spots

    reported_at: datetime = Field(default_factory=utcnow)
    expires_at: datetime
    # Anonymous reporter reference — an opaque token, no PII, no login (§8).
    reporter_ref: Optional[str] = Field(default=None, index=True)


class Feedback(SQLModel, table=True):
    __tablename__ = "feedback"

    id: Optional[int] = Field(default=None, primary_key=True)
    spot_id: int = Field(foreign_key="spot.id", index=True)
    kind: FeedbackKind
    at: datetime = Field(default_factory=utcnow)


class User(SQLModel, table=True):
    """Optional, minimal profile. No login is required to report or be guided (§3)."""

    __tablename__ = "app_user"

    id: Optional[int] = Field(default=None, primary_key=True)
    role: str = Field(default="collector")  # reporter|collector|helper|admin
    age_band: Optional[str] = Field(default=None)
    voice_lang: str = Field(default="ko")
    speech_rate: float = Field(default=1.0)
    units: str = Field(default="m")
    created_at: datetime = Field(default_factory=utcnow)


class GuidanceSession(SQLModel, table=True):
    """Transient guidance session. Collectors are NOT tracked long-term (§8):
    positions are used live; this row keeps only a short-lived pointer and is
    safe to purge. No trail of ``lastPos`` history is retained."""

    __tablename__ = "guidance_session"

    id: Optional[int] = Field(default=None, primary_key=True)
    collector_ref: Optional[str] = Field(default=None)
    target_spot_id: Optional[int] = Field(default=None, foreign_key="spot.id")
    started_at: datetime = Field(default_factory=utcnow)
