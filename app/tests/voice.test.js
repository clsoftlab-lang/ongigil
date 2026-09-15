// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createQueue, createCalloutPlanner, COUNTDOWN_THRESHOLDS } from '../js/voice.js';

test('queue: never floods — bounded pending count', () => {
  const q = createQueue({ maxPending: 3 });
  for (let i = 0; i < 20; i++) q.enqueue(`line ${i}`);
  assert.ok(q.pending <= 3, `pending=${q.pending}`);
});

test('queue: drops OLDEST non-urgent so newest info wins', () => {
  const q = createQueue({ maxPending: 2 });
  q.enqueue('a');
  q.enqueue('b');
  q.enqueue('c'); // pushes out 'a'
  const texts = q.peek().map((x) => x.text);
  assert.deepEqual(texts, ['b', 'c']);
});

test('queue: dedups identical consecutive lines', () => {
  const q = createQueue({ maxPending: 5 });
  assert.equal(q.enqueue('같은 말'), true);
  assert.equal(q.enqueue('같은 말'), false); // duplicate rejected
  assert.equal(q.pending, 1);
});

test('queue: urgent bypasses and clears chatter', () => {
  const q = createQueue({ maxPending: 3 });
  q.enqueue('chatter 1');
  q.enqueue('chatter 2');
  q.enqueue('도착했어요', { urgent: true });
  const texts = q.peek().map((x) => x.text);
  assert.deepEqual(texts, ['도착했어요']);
});

test('queue: next() pops in order', () => {
  const q = createQueue({ maxPending: 3 });
  q.enqueue('one');
  q.enqueue('two');
  assert.equal(q.next().text, 'one');
  assert.equal(q.next().text, 'two');
  assert.equal(q.next(), null);
});

test('callout planner: far updates every stepMeters', () => {
  const p = createCalloutPlanner({ stepMeters: 20 });
  assert.equal(p.update(300), 300);   // first announce
  assert.equal(p.update(290), null);  // <20m change
  assert.equal(p.update(275), 280);   // 25m change -> announce (rounded)
});

test('callout planner: countdown fires each threshold once, descending', () => {
  const p = createCalloutPlanner();
  const fired = [];
  // walk down entirely within the countdown band (<=50m)
  for (const d of [50, 48, 39, 29, 19, 12, 8, 4]) {
    const n = p.update(d);
    if (n != null) fired.push(n);
  }
  // thresholds are 50,40,30,20,10,5 — each crossed exactly once
  assert.deepEqual(fired, [50, 40, 30, 20, 10, 5]);
});

test('callout planner: far updates (>50m) announce distance, not thresholds', () => {
  const p = createCalloutPlanner({ stepMeters: 20 });
  assert.equal(p.update(300), 300); // far branch announces the distance
  assert.equal(p.update(60), 60);   // still >50 -> far update, rounded
});

test('callout planner: a threshold is never repeated', () => {
  const p = createCalloutPlanner();
  assert.equal(p.update(45), 50); // below 50
  assert.equal(p.update(44), null); // 50 already fired, 40 not yet reached
  assert.equal(p.update(38), 40);
});

test('COUNTDOWN_THRESHOLDS: sane and includes sub-50 markers', () => {
  assert.ok(COUNTDOWN_THRESHOLDS.includes(50));
  assert.ok(COUNTDOWN_THRESHOLDS.includes(10));
  assert.ok(Math.max(...COUNTDOWN_THRESHOLDS) <= 50);
});
