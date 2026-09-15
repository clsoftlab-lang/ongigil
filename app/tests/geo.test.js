// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  haversine, bearing, destinationPoint, compassWord, relativeTurn,
  closerFarther, arrivalState, nearestOpenSpot, spotsByDistance,
  ARRIVAL_M, ALMOST_M,
} from '../js/geo.js';

test('haversine: known distance ~1.11 km per 0.01° latitude', () => {
  const d = haversine(37.5, 127.0, 37.51, 127.0);
  assert.ok(Math.abs(d - 1111) < 5, `got ${d}`);
});

test('haversine: zero distance', () => {
  assert.equal(haversine(37, 127, 37, 127), 0);
});

test('bearing: due north / east / south / west', () => {
  assert.ok(Math.abs(bearing(0, 0, 1, 0) - 0) < 0.5);       // north
  assert.ok(Math.abs(bearing(0, 0, 0, 1) - 90) < 0.5);      // east
  assert.ok(Math.abs(bearing(0.001, 0, 0, 0) - 180) < 0.5); // south
  assert.ok(Math.abs(bearing(0, 0.001, 0, 0) - 270) < 0.5); // west
});

test('destinationPoint round-trips with haversine + bearing', () => {
  const p = destinationPoint(37.5665, 126.978, 45, 100);
  const d = haversine(37.5665, 126.978, p.lat, p.lng);
  const b = bearing(37.5665, 126.978, p.lat, p.lng);
  assert.ok(Math.abs(d - 100) < 1, `dist ${d}`);
  assert.ok(Math.abs(b - 45) < 1, `bearing ${b}`);
});

test('compassWord: 8-point in ko and en', () => {
  assert.equal(compassWord(0, 'ko'), '북쪽');
  assert.equal(compassWord(45, 'ko'), '북동쪽');
  assert.equal(compassWord(90, 'ko'), '동쪽');
  assert.equal(compassWord(225, 'ko'), '남서쪽');
  assert.equal(compassWord(0, 'en'), 'north');
  assert.equal(compassWord(45, 'en'), 'north-east');
  assert.equal(compassWord(315, 'en'), 'north-west');
  // wraps around
  assert.equal(compassWord(359, 'ko'), '북쪽');
});

test('relativeTurn: straight / right / left / around', () => {
  assert.equal(relativeTurn(0, 0, 'ko').key, 'straight');
  assert.equal(relativeTurn(90, 0, 'ko').key, 'right');
  assert.equal(relativeTurn(270, 0, 'ko').key, 'left');
  assert.equal(relativeTurn(180, 0, 'ko').key, 'around');
  assert.equal(relativeTurn(45, 0, 'ko').key, 'slightRight');
  assert.equal(relativeTurn(315, 0, 'ko').key, 'slightLeft');
  // english text present
  assert.equal(relativeTurn(90, 0, 'en').text, 'turn right');
  assert.equal(relativeTurn(0, 0, 'ko').text, '앞으로');
});

test('relativeTurn: accounts for user heading', () => {
  // target due east (90), user facing east (90) => straight
  assert.equal(relativeTurn(90, 90, 'ko').key, 'straight');
  // target north (0), user facing east (90) => target is to the left
  assert.equal(relativeTurn(0, 90, 'ko').key, 'left');
});

test('closerFarther: deadband + direction', () => {
  assert.equal(closerFarther(100, 90, 'ko').key, 'closer');
  assert.equal(closerFarther(90, 100, 'ko').key, 'farther');
  assert.equal(closerFarther(100, 99.5, 'ko'), null); // within deadband
  assert.equal(closerFarther(null, 50, 'ko'), null);  // no previous
  assert.equal(closerFarther(100, 90, 'en').text, 'getting closer');
});

test('arrivalState: thresholds', () => {
  assert.equal(arrivalState(ARRIVAL_M - 1), 'arrived');
  assert.equal(arrivalState(ARRIVAL_M), 'arrived');
  assert.equal(arrivalState(ALMOST_M), 'almost');
  assert.equal(arrivalState(ALMOST_M + 1), 'far');
  assert.equal(arrivalState(200), 'far');
});

test('nearestOpenSpot: picks closest OPEN spot, skips taken/gone', () => {
  const pos = { lat: 37.5665, lng: 126.978 };
  const near = destinationPoint(pos.lat, pos.lng, 0, 50);
  const far = destinationPoint(pos.lat, pos.lng, 0, 500);
  const spots = [
    { id: 'a', lat: near.lat, lng: near.lng, status: 'taken' }, // closest but taken -> skip
    { id: 'b', lat: far.lat, lng: far.lng, status: 'open' },
    { id: 'c', lat: destinationPoint(pos.lat, pos.lng, 0, 120).lat, lng: destinationPoint(pos.lat, pos.lng, 0, 120).lng, status: 'open' },
  ];
  const r = nearestOpenSpot(pos, spots);
  assert.equal(r.spot.id, 'c');
});

test('spotsByDistance: sorted ascending with bearing attached', () => {
  const pos = { lat: 37.5665, lng: 126.978 };
  const spots = [
    { id: 'far', ...destinationPoint(pos.lat, pos.lng, 90, 300) },
    { id: 'near', ...destinationPoint(pos.lat, pos.lng, 90, 50) },
  ];
  const sorted = spotsByDistance(pos, spots);
  assert.equal(sorted[0].id, 'near');
  assert.ok(sorted[0].distance < sorted[1].distance);
  assert.ok(Math.abs(sorted[0].bearing - 90) < 1);
});
