// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedSpots, simulateWalk, DEMO_ORIGIN } from '../js/mock.js';
import { haversine, ARRIVAL_M, nearestOpenSpot } from '../js/geo.js';

test('seedSpots: produces open spots with kind/size/expiry', () => {
  const spots = seedSpots(DEMO_ORIGIN, 1_000_000);
  assert.ok(spots.length >= 4);
  for (const s of spots) {
    assert.equal(s.status, 'open');
    assert.ok(['paper', 'box', 'mixed'].includes(s.kind));
    assert.ok(['small', 'medium', 'large'].includes(s.size));
    assert.ok(s.expiresAt > s.reportedAt);
    assert.ok(Number.isFinite(s.lat) && Number.isFinite(s.lng));
  }
});

test('seedSpots: spots are within a walkable radius of the origin', () => {
  const spots = seedSpots(DEMO_ORIGIN);
  for (const s of spots) {
    const d = haversine(DEMO_ORIGIN.lat, DEMO_ORIGIN.lng, s.lat, s.lng);
    assert.ok(d > 0 && d < 1000, `spot ${s.id} at ${d}m`);
  }
});

test('simulateWalk: reaches the target and ends within arrival threshold', () => {
  const spots = seedSpots(DEMO_ORIGIN);
  const target = spots[1]; // ~130m away
  const path = simulateWalk(DEMO_ORIGIN, target);
  assert.ok(path.length > 2, 'walk has steps');
  const last = path[path.length - 1];
  const finalDist = haversine(last.lat, last.lng, target.lat, target.lng);
  assert.ok(finalDist <= ARRIVAL_M, `final distance ${finalDist} should trigger arrival`);
});

test('simulateWalk: distance is (broadly) monotonic downward', () => {
  const spots = seedSpots(DEMO_ORIGIN);
  const target = spots[0];
  const path = simulateWalk(DEMO_ORIGIN, target);
  const first = haversine(path[0].lat, path[0].lng, target.lat, target.lng);
  const mid = haversine(path[Math.floor(path.length / 2)].lat, path[Math.floor(path.length / 2)].lng, target.lat, target.lng);
  assert.ok(mid < first, 'closer at the midpoint than the start');
});

test('nearest-spot selection from seeded set matches geometric nearest', () => {
  const spots = seedSpots(DEMO_ORIGIN);
  const r = nearestOpenSpot(DEMO_ORIGIN, spots);
  // spec seed #1 is the 60m box — the closest of the set
  const dists = spots.map((s) => haversine(DEMO_ORIGIN.lat, DEMO_ORIGIN.lng, s.lat, s.lng));
  assert.equal(Math.min(...dists), haversine(DEMO_ORIGIN.lat, DEMO_ORIGIN.lng, r.spot.lat, r.spot.lng));
});
