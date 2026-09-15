# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
"""The ``Directions`` interface (§5).

Ships with:
  - ``HomingDirections`` — the DEFAULT. Pure compass/GPS math, NO external calls,
    NO key. Given two coordinates it returns a bearing + distance "homing" step.
  - ``ProviderStub`` — a placeholder for a real walking-directions provider
    (Kakao/Naver/Google). It raises ``ProviderNotConfigured`` because no key is
    committed to this repo; an operator supplies one via the environment later.

Client "closer/farther" semantics: the app calls this repeatedly as the collector
walks and compares successive ``total_distance_m`` — a shrinking distance means
"가까워지고 있어요 (getting closer)", a growing one means "멀어지고 있어요 (getting
farther)". The bearing/compass word tells them which way to face. See README.
"""
from __future__ import annotations

from typing import Protocol

from ..geo import LatLon, bearing_deg, compass_word, haversine_m
from ..schemas import DirectionsOut, DirectionStep


class ProviderNotConfigured(RuntimeError):
    """Raised by ProviderStub — configure a provider key (env only) to enable it."""


class Directions(Protocol):
    mode: str

    def route(self, frm: LatLon, to: LatLon, lang: str = "ko") -> DirectionsOut: ...


class HomingDirections:
    """Key-free default. Returns a single homing step: face this bearing, walk this
    far. The client repeats the call and derives closer/farther + arrival cues."""

    mode = "homing"

    def route(self, frm: LatLon, to: LatLon, lang: str = "ko") -> DirectionsOut:
        dist = haversine_m(frm, to)
        brg = bearing_deg(frm, to)
        word = compass_word(brg, lang)
        if lang == "en":
            instruction = f"Head {word}, about {round(dist)} m."
            note = ("Homing mode: no map key needed. Call again as you walk; a "
                    "shrinking distance means you are getting closer.")
        else:
            instruction = f"{word}으로 약 {round(dist)} m 가세요."
            note = ("호밍 모드: 지도 키가 필요 없습니다. 걸으면서 다시 호출하세요. "
                    "거리가 줄어들면 가까워지는 것입니다.")
        step = DirectionStep(
            bearing_deg=round(brg, 1),
            compass=word,
            distance_m=round(dist, 1),
            instruction=instruction,
        )
        return DirectionsOut(
            mode=self.mode,
            steps=[step],
            total_distance_m=round(dist, 1),
            note=note,
        )


class ProviderStub:
    """Placeholder for a real turn-by-turn provider. Off until a key is set (§5)."""

    mode = "provider"

    def __init__(self, api_key: str = "") -> None:
        self._api_key = api_key

    def route(self, frm: LatLon, to: LatLon, lang: str = "ko") -> DirectionsOut:
        raise ProviderNotConfigured(
            "provider not configured — set a directions provider key in the "
            "environment (never commit it) to enable turn-by-turn"
        )


def get_directions() -> Directions:
    """Factory selected by config. Defaults to key-free HomingDirections."""
    from ..config import get_settings

    settings = get_settings()
    if settings.directions == "provider":
        return ProviderStub(api_key=settings.directions_provider_key)
    return HomingDirections()
