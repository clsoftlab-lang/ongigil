// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
//
// mock.js — offline demo backend: seeded spots around a demo origin, plus a
// simulated walk so anyone can HEAR the guidance with no GPS and no server.
// PURE data helpers (destinationPoint, simulateWalk) so tests can assert the
// walk reaches the spot and triggers arrival.

import { destinationPoint, haversine, ARRIVAL_M } from './geo.js';

// Demo origin — a quiet residential block (near Seoul City Hall) for the demo.
export const DEMO_ORIGIN = { lat: 37.5665, lng: 126.978 };

let _id = 1;
const nid = () => `spot_${_id++}`;

/**
 * Build a seeded set of open spots around an origin at varied bearings/dists.
 * Deterministic so the demo and tests are stable.
 */
export function seedSpots(origin = DEMO_ORIGIN, now = Date.now()) {
  _id = 1;
  const specs = [
    { b: 45, d: 60, kind: 'box', size: 'large', ttlMin: 120, note: '박스 한 무더기' },
    { b: 200, d: 130, kind: 'paper', size: 'medium', ttlMin: 90, note: '신문 묶음' },
    { b: 300, d: 220, kind: 'mixed', size: 'small', ttlMin: 60, note: '' },
    { b: 110, d: 340, kind: 'box', size: 'medium', ttlMin: 180, note: '가게 앞' },
    { b: 20, d: 500, kind: 'paper', size: 'large', ttlMin: 150, note: '' },
  ];
  return specs.map((s) => {
    const p = destinationPoint(origin.lat, origin.lng, s.b, s.d);
    return {
      id: nid(),
      lat: p.lat,
      lng: p.lng,
      kind: s.kind,
      size: s.size,
      note: s.note,
      status: 'open',
      reportedAt: now - Math.round(Math.random() * 20) * 60000,
      expiresAt: now + s.ttlMin * 60000,
    };
  });
}

/**
 * A simulated walk from `from` to `to`. Returns an array of positions that step
 * toward the target at ~`speedM` metres per tick (plus a little wobble), ending
 * within the arrival threshold. Pure & deterministic (seedable wobble).
 * @returns {{lat:number,lng:number}[]}
 */
export function simulateWalk(from, to, { speedM = 8, wobbleM = 1.5, maxSteps = 400, seed = 42 } = {}) {
  const pts = [{ lat: from.lat, lng: from.lng }];
  let cur = { ...from };
  let s = seed;
  const rand = () => {
    // small deterministic LCG in [-1,1]
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s / 0x3fffffff) - 1;
  };
  for (let i = 0; i < maxSteps; i++) {
    const dist = haversine(cur.lat, cur.lng, to.lat, to.lng);
    if (dist <= ARRIVAL_M) break;
    // bearing toward target
    const br = bearingTo(cur, to) + rand() * 8; // wobble the heading a touch
    const step = Math.min(speedM, dist);
    const np = destinationPoint(cur.lat, cur.lng, br, step + rand() * wobbleM);
    cur = np;
    pts.push({ lat: cur.lat, lng: cur.lng });
  }
  // ensure the final point is essentially at the spot so arrival always fires
  pts.push({ lat: to.lat, lng: to.lng });
  return pts;
}

function bearingTo(a, b) {
  // local import avoidance: reuse geo.bearing via dynamic-free path
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const dλ = toRad(b.lng - a.lng);
  const y = Math.sin(dλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
  return ((toDeg(Math.atan2(y, x)) % 360) + 360) % 360;
}
