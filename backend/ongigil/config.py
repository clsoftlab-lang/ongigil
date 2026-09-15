# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
"""Environment-driven configuration.

Every knob is read from the environment with a safe default so the whole service
runs with **zero secrets**. A directions-provider key, if an operator ever adds one,
is read here from the environment only and is NEVER committed to the repo.

Values are read at instantiation time (inside ``get_settings``), so tests and
operators can change the environment and pick it up via ``get_settings.cache_clear()``.
"""
from __future__ import annotations

import os
from functools import lru_cache

from pydantic import BaseModel


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _env_str(name: str, default: str) -> str:
    raw = os.getenv(name)
    return default if raw is None else raw


class Settings(BaseModel):
    """Runtime settings. All fields have privacy-safe defaults."""

    # --- Storage -------------------------------------------------------------
    database_url: str = "sqlite:///./ongigil.db"

    # --- Spot lifecycle ------------------------------------------------------
    # Reports expire so collectors are never sent to recyclables long gone (§2).
    spot_ttl_seconds: int = 4 * 60 * 60  # 4h

    # --- Privacy: location coarsening (§8) -----------------------------------
    # Shared locations are snapped to a grid of roughly this many metres so an
    # exact coordinate is never revealed. ~50-100 m keeps it useful yet vague.
    coarsen_grid_m: float = 75.0

    # --- Nearby query --------------------------------------------------------
    nearby_default_radius_m: float = 1500.0
    nearby_max_radius_m: float = 10000.0
    nearby_max_results: int = 50

    # --- Region defaults (demo origin: central Seoul) ------------------------
    region_default_lat: float = 37.5665
    region_default_lon: float = 126.9780

    # --- Directions ----------------------------------------------------------
    # "homing" (default, no key) or "provider" (stub → 501 until a key exists).
    directions: str = "homing"
    # Provider key is env-only and never committed. Empty in this repo.
    directions_provider_key: str = ""

    # --- CORS ----------------------------------------------------------------
    cors_allow_origins: str = "*"


def _read_env() -> Settings:
    return Settings(
        database_url=_env_str("ONGIGIL_DATABASE_URL", "sqlite:///./ongigil.db"),
        spot_ttl_seconds=_env_int("ONGIGIL_SPOT_TTL_SECONDS", 4 * 60 * 60),
        coarsen_grid_m=_env_float("ONGIGIL_COARSEN_GRID_M", 75.0),
        nearby_default_radius_m=_env_float("ONGIGIL_NEARBY_RADIUS_M", 1500.0),
        nearby_max_radius_m=_env_float("ONGIGIL_NEARBY_MAX_RADIUS_M", 10000.0),
        nearby_max_results=_env_int("ONGIGIL_NEARBY_MAX_RESULTS", 50),
        region_default_lat=_env_float("ONGIGIL_REGION_LAT", 37.5665),
        region_default_lon=_env_float("ONGIGIL_REGION_LON", 126.9780),
        directions=_env_str("ONGIGIL_DIRECTIONS", "homing").strip().lower(),
        directions_provider_key=_env_str("ONGIGIL_DIRECTIONS_PROVIDER_KEY", ""),
        cors_allow_origins=_env_str("ONGIGIL_CORS_ORIGINS", "*"),
    )


@lru_cache
def get_settings() -> Settings:
    return _read_env()
