# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
"""Shared test fixtures.

Set an isolated temp SQLite DB via env BEFORE importing the app, and rebuild the
schema per test for isolation.
"""
from __future__ import annotations

import os
import tempfile

# Isolated DB for the whole test session, set before any ongigil import.
_DB_FD, _DB_PATH = tempfile.mkstemp(suffix=".db", prefix="ongigil_test_")
os.close(_DB_FD)
os.environ["ONGIGIL_DATABASE_URL"] = f"sqlite:///{_DB_PATH}"
os.environ.pop("ONGIGIL_DIRECTIONS", None)  # ensure default (homing)
os.environ.pop("ONGIGIL_DIRECTIONS_PROVIDER_KEY", None)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlmodel import SQLModel  # noqa: E402

from ongigil.config import get_settings  # noqa: E402
from ongigil.db import engine  # noqa: E402
from ongigil.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def _fresh_db():
    # Clear cached settings so each test reads the current environment, and so a
    # test that changed env (then let monkeypatch restore it) can't leak config.
    get_settings.cache_clear()
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)
    get_settings.cache_clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


# Demo origin (central Seoul). Off-grid coordinates so coarsening must change them.
ORIGIN_LAT = 37.566500
ORIGIN_LON = 126.978000
