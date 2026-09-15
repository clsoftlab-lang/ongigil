# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
"""Users router: OPTIONAL minimal prefs + export/delete (data rights, §8).

No login is required to report or be guided. This exists only for a collector or
helper who wants to save voice/language/speed preferences, and it always offers a
way to export and permanently delete that data.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..db import get_session
from ..models import GuidanceSession, User
from ..schemas import UserPrefsIn, UserPrefsOut

router = APIRouter(prefix="/users", tags=["users"])


def _to_out(user: User) -> UserPrefsOut:
    return UserPrefsOut(
        id=user.id,
        role=user.role,
        age_band=user.age_band,
        voice_lang=user.voice_lang,
        speech_rate=user.speech_rate,
        units=user.units,
        created_at=user.created_at,
    )


@router.post("", response_model=UserPrefsOut, status_code=201)
def create_prefs(payload: UserPrefsIn, session: Session = Depends(get_session)) -> UserPrefsOut:
    user = User(
        role=payload.role,
        age_band=payload.age_band,
        voice_lang=payload.voice_lang,
        speech_rate=payload.speech_rate,
        units=payload.units,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return _to_out(user)


@router.get("/{user_id}", response_model=UserPrefsOut)
def get_prefs(user_id: int, session: Session = Depends(get_session)) -> UserPrefsOut:
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    return _to_out(user)


@router.put("/{user_id}", response_model=UserPrefsOut)
def update_prefs(
    user_id: int, payload: UserPrefsIn, session: Session = Depends(get_session)
) -> UserPrefsOut:
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    user.role = payload.role
    user.age_band = payload.age_band
    user.voice_lang = payload.voice_lang
    user.speech_rate = payload.speech_rate
    user.units = payload.units
    session.add(user)
    session.commit()
    session.refresh(user)
    return _to_out(user)


@router.get("/{user_id}/export")
def export_data(user_id: int, session: Session = Depends(get_session)) -> dict:
    """Export everything held about this user (data rights, §8)."""
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    sessions = session.exec(
        select(GuidanceSession).where(GuidanceSession.collector_ref == str(user_id))
    ).all()
    return {
        "user": _to_out(user).model_dump(mode="json"),
        "guidance_sessions": [s.model_dump(mode="json") for s in sessions],
    }


@router.delete("/{user_id}", status_code=200)
def delete_data(user_id: int, session: Session = Depends(get_session)) -> dict:
    """Permanently delete this user's profile and any transient guidance rows."""
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    sessions = session.exec(
        select(GuidanceSession).where(GuidanceSession.collector_ref == str(user_id))
    ).all()
    for s in sessions:
        session.delete(s)
    session.delete(user)
    session.commit()
    return {"deleted": True, "user_id": user_id}
