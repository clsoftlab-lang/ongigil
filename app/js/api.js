// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
//
// api.js — the ONLY place that talks to the backend. One typed client with a
// configurable base URL. When the base URL is empty (default) it uses a
// built-in MOCK backend so the whole app works offline, with no keys, forever.
//
// Backend contract (../backend, aligned to its real routes):
//   GET  {base}/spots/nearby?lat=&lon=&radius_m=&lang=ko  -> SpotNearby[]  (a bare list)
//   POST {base}/spots  body:{lat,lon,kind,size,note}      -> SpotPublic
//   GET  {base}/spots/:id                                 -> SpotPublic
//   POST {base}/spots/:id/feedback  body:{kind}           -> SpotPublic
// The backend uses `lon` (not `lng`), coarsens all locations server-side (§8), and
// returns bare objects/lists (no {spots}/{spot} wrapper). fromServer() maps a
// server Spot into this app's internal shape (lng, status, distance).

import { seedSpots, DEMO_ORIGIN } from './mock.js';
import { spotsByDistance } from './geo.js';
import { getPrefs, getState, setMockSpots } from './state.js';

function base() {
  const b = (getPrefs().apiBaseUrl || '').trim();
  return b.replace(/\/+$/, '');
}

export function isMock() {
  return base() === '';
}

// ---- Built-in mock store ----------------------------------------------------

function mockStore() {
  const st = getState();
  if (!st.mockSpots) setMockSpots(seedSpots(DEMO_ORIGIN));
  return st.mockSpots;
}

function pruneExpired(spots, now = Date.now()) {
  return spots.map((s) => (s.expiresAt && s.expiresAt < now && s.status === 'open' ? { ...s, status: 'expired' } : s));
}

// Map a server Spot (SpotPublic/SpotNearby: uses `lon`, no client-only fields)
// into this app's internal shape (`lng`, `status: 'open'`, optional distance).
function fromServer(s) {
  if (!s) return null;
  return {
    id: String(s.id),
    lat: s.lat,
    lng: s.lon,
    kind: s.kind || 'mixed',
    size: s.size || 'medium',
    note: s.note || '',
    status: s.status || 'open',
    ...(typeof s.distance_m === 'number' ? { distance: s.distance_m } : {}),
  };
}

// The app uses taken | not_there | report_bad; the backend uses taken | gone | bad.
function feedbackKindForServer(kind) {
  return kind === 'not_there' ? 'gone' : kind === 'report_bad' ? 'bad' : 'taken';
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Public client ----------------------------------------------------------

export async function nearbySpots(pos, radiusM = 2000) {
  if (isMock()) {
    await delay(120);
    const pruned = pruneExpired(mockStore());
    setMockSpots(pruned);
    return spotsByDistance(pos, pruned.filter((s) => s.status === 'open')).filter((s) => s.distance <= radiusM);
  }
  const lang = (getPrefs().voiceLang || 'ko').slice(0, 2);
  const url = `${base()}/spots/nearby?lat=${pos.lat}&lon=${pos.lng}&radius_m=${radiusM}&lang=${lang}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`nearby failed: ${res.status}`);
  const data = await res.json();
  const list = (Array.isArray(data) ? data : data.spots || []).map(fromServer);
  return spotsByDistance(pos, list);
}

export async function reportSpot(spot) {
  if (isMock()) {
    await delay(120);
    const now = Date.now();
    const ttlMin = spot.ttlMin || 120;
    const full = {
      id: `spot_local_${now}`,
      lat: spot.lat,
      lng: spot.lng,
      kind: spot.kind || 'mixed',
      size: spot.size || 'medium',
      note: spot.note || '',
      status: 'open',
      reportedAt: now,
      expiresAt: now + ttlMin * 60000,
    };
    const spots = mockStore().slice();
    spots.push(full);
    setMockSpots(spots);
    return full;
  }
  // Backend coarsens the location itself; it takes lat/lon/kind/size/note.
  const res = await fetch(`${base()}/spots`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      lat: spot.lat,
      lon: spot.lng,
      kind: spot.kind || 'mixed',
      size: spot.size || 'medium',
      note: spot.note || '',
    }),
  });
  if (!res.ok) throw new Error(`report failed: ${res.status}`);
  return fromServer(await res.json());
}

export async function getSpot(id) {
  if (isMock()) {
    await delay(40);
    return mockStore().find((s) => s.id === id) || null;
  }
  const res = await fetch(`${base()}/spots/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`getSpot failed: ${res.status}`);
  return fromServer(await res.json());
}

export async function feedback(spotId, kind /* taken | not_there | report_bad */) {
  if (isMock()) {
    await delay(60);
    const spots = mockStore().map((s) =>
      s.id === spotId
        ? { ...s, status: kind === 'taken' ? 'taken' : kind === 'not_there' ? 'gone' : s.status }
        : s,
    );
    setMockSpots(spots);
    return { ok: true };
  }
  const res = await fetch(`${base()}/spots/${encodeURIComponent(spotId)}/feedback`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind: feedbackKindForServer(kind) }),
  });
  if (!res.ok) throw new Error(`feedback failed: ${res.status}`);
  return fromServer(await res.json());
}
