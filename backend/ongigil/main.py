# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
"""온기길 (Ongigil) API — FastAPI app.

A small, stateless public-good API: spots (report/nearby/expire/feedback),
location coarsening for privacy, and a key-free Directions interface. Runs with
**no secrets**.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import create_db_and_tables
from .routers import directions, spots, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(
    title="온기길 (Ongigil) API",
    version="0.1.0",
    description=(
        "A warm path for elderly recyclable-paper collectors. "
        "Anonymous reports, coarsened locations, key-free homing guidance. "
        "No money, no ads, no third-party data sharing."
    ),
    lifespan=lifespan,
)

_settings = get_settings()
_origins = [o.strip() for o in _settings.cors_allow_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(spots.router)
app.include_router(directions.router)
app.include_router(users.router)


@app.get("/health", tags=["meta"])
def health() -> dict:
    settings = get_settings()  # read live so config changes are reflected
    return {
        "status": "ok",
        "service": "ongigil",
        "version": "0.1.0",
        "directions_mode": settings.directions,
        "coarsen_grid_m": settings.coarsen_grid_m,
        "keys_required": False,
    }
