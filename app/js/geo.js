// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
//
// geo.js — PURE geometry + spoken-direction helpers.
// No DOM, no browser APIs: fully unit-testable under `node --test`.
// Everything a collector needs to be guided by ear is computed here from
// two lat/lng points (+ optional compass heading): distance, bearing,
// compass word, relative turn, "closer / farther", and arrival state.

const R_EARTH = 6371000; // metres

export const toRad = (deg) => (deg * Math.PI) / 180;
export const toDeg = (rad) => (rad * 180) / Math.PI;

/** Normalise a bearing/angle into [0, 360). */
export function normalizeBearing(deg) {
  return ((deg % 360) + 360) % 360;
}

/** Great-circle distance in metres (haversine). */
export function haversine(lat1, lon1, lat2, lon2) {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const dφ = toRad(lat2 - lat1);
  const dλ = toRad(lon2 - lon1);
  const a =
    Math.sin(dφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial bearing (forward azimuth) from point 1 to point 2, degrees [0,360). */
export function bearing(lat1, lon1, lat2, lon2) {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const dλ = toRad(lon2 - lon1);
  const y = Math.sin(dλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
  return normalizeBearing(toDeg(Math.atan2(y, x)));
}

/**
 * Project a point: from (lat,lng) travel `distanceM` metres along `bearingDeg`.
 * Used by the mock/demo to place spots and simulate a walk. Pure.
 */
export function destinationPoint(lat, lng, bearingDeg, distanceM) {
  const δ = distanceM / R_EARTH;
  const θ = toRad(bearingDeg);
  const φ1 = toRad(lat);
  const λ1 = toRad(lng);
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ),
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    );
  return { lat: toDeg(φ2), lng: (((toDeg(λ2) + 540) % 360) - 180) };
}

// ---- Spoken direction words -------------------------------------------------

const COMPASS = {
  ko: ['북쪽', '북동쪽', '동쪽', '남동쪽', '남쪽', '남서쪽', '서쪽', '북서쪽'],
  en: ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'],
};

/** Bearing → 8-point compass word in the given language. */
export function compassWord(bearingDeg, lang = 'ko') {
  const table = COMPASS[lang] || COMPASS.ko;
  const idx = Math.round(normalizeBearing(bearingDeg) / 45) % 8;
  return table[idx];
}

const TURN = {
  ko: {
    straight: '앞으로',
    slightRight: '오른쪽 앞으로',
    right: '오른쪽으로 도세요',
    slightLeft: '왼쪽 앞으로',
    left: '왼쪽으로 도세요',
    around: '뒤로 도세요',
  },
  en: {
    straight: 'straight ahead',
    slightRight: 'ahead and to the right',
    right: 'turn right',
    slightLeft: 'ahead and to the left',
    left: 'turn left',
    around: 'turn around',
  },
};

/**
 * Relative-turn instruction from the user's compass `heading` toward `bearingDeg`.
 * Positive relative angle = target is to the right. Returns { key, text }.
 */
export function relativeTurn(bearingDeg, heading, lang = 'ko') {
  const table = TURN[lang] || TURN.ko;
  const rel = ((bearingDeg - heading + 540) % 360) - 180; // -180..180, +=right
  const a = Math.abs(rel);
  let key;
  if (a <= 25) key = 'straight';
  else if (a >= 135) key = 'around';
  else if (rel > 0) key = a <= 75 ? 'slightRight' : 'right';
  else key = a <= 75 ? 'slightLeft' : 'left';
  return { key, text: table[key] };
}

/**
 * "Getting closer / farther" from a distance delta, with a dead-band so small
 * GPS jitter does not chatter. Returns { key, text } or null when unchanged.
 */
const TREND = {
  ko: { closer: '가까워지고 있어요', farther: '멀어지고 있어요' },
  en: { closer: 'getting closer', farther: 'getting farther' },
};
export function closerFarther(prevDist, currDist, lang = 'ko', deadbandM = 2) {
  if (prevDist == null) return null;
  const delta = currDist - prevDist;
  if (delta <= -deadbandM) return { key: 'closer', text: (TREND[lang] || TREND.ko).closer };
  if (delta >= deadbandM) return { key: 'farther', text: (TREND[lang] || TREND.ko).farther };
  return null;
}

// Arrival thresholds (metres). Spec §4.
export const ARRIVAL_M = 8;
export const ALMOST_M = 15;

/** Classify a distance into 'arrived' | 'almost' | 'far'. */
export function arrivalState(distanceM) {
  if (distanceM <= ARRIVAL_M) return 'arrived';
  if (distanceM <= ALMOST_M) return 'almost';
  return 'far';
}

/**
 * Pick the nearest OPEN spot to a position. Spots without a status are treated
 * as open. Returns { spot, distance } or null. Pure — used by guidance + tests.
 */
export function nearestOpenSpot(pos, spots) {
  let best = null;
  for (const s of spots || []) {
    if (s.status && s.status !== 'open') continue;
    const d = haversine(pos.lat, pos.lng, s.lat, s.lng);
    if (!best || d < best.distance) best = { spot: s, distance: d };
  }
  return best;
}

/** Sort a copy of spots by distance to pos (open first is caller's choice). */
export function spotsByDistance(pos, spots) {
  return (spots || [])
    .map((s) => ({ ...s, distance: haversine(pos.lat, pos.lng, s.lat, s.lng), bearing: bearing(pos.lat, pos.lng, s.lat, s.lng) }))
    .sort((a, b) => a.distance - b.distance);
}

/** Human-friendly distance string, ears-first (rounded, no decimals near). */
export function formatDistance(distanceM, units = 'm') {
  void units; // metric only for v0.1 (spec §3)
  if (distanceM < 10) return `${Math.round(distanceM)}`;
  if (distanceM < 100) return `${Math.round(distanceM / 5) * 5}`;
  return `${Math.round(distanceM / 10) * 10}`;
}
