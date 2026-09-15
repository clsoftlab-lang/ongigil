# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
"""Optional prefs + export/delete (data rights, §8)."""
from __future__ import annotations


def test_prefs_create_get_update(client):
    r = client.post("/users", json={"role": "collector", "voice_lang": "ko", "speech_rate": 1.2})
    assert r.status_code == 201
    uid = r.json()["id"]
    assert r.json()["speech_rate"] == 1.2

    assert client.get(f"/users/{uid}").json()["voice_lang"] == "ko"

    r = client.put(f"/users/{uid}", json={"role": "collector", "voice_lang": "en", "speech_rate": 0.9})
    assert r.status_code == 200
    assert r.json()["voice_lang"] == "en"


def test_export_and_delete(client):
    uid = client.post("/users", json={"role": "helper"}).json()["id"]

    exp = client.get(f"/users/{uid}/export")
    assert exp.status_code == 200
    assert exp.json()["user"]["id"] == uid

    d = client.delete(f"/users/{uid}")
    assert d.status_code == 200
    assert d.json()["deleted"] is True
    # Gone afterwards.
    assert client.get(f"/users/{uid}").status_code == 404
