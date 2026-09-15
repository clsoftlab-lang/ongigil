// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
//
// state.js — tiny observable store. Persists collector preferences and the
// demo/offline spot list to localStorage. Collector positions are NEVER
// persisted (spec §8: collectors are not tracked).

const LS_KEY = 'ongigil.v1';

export const DEFAULT_PREFS = {
  voiceLang: 'ko',      // 'ko' | 'en'
  speechRate: 1.0,      // 0.5 .. 1.5
  textSize: 'large',    // 'large' | 'xlarge'  (large is already big)
  keepScreenOn: true,
  units: 'm',
  muted: false,
  apiBaseUrl: '',       // empty => built-in mock/demo backend
  onboarded: false,
};

function loadPersisted() {
  try {
    const raw = globalThis.localStorage?.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

const persisted = loadPersisted();

const state = {
  prefs: { ...DEFAULT_PREFS, ...(persisted.prefs || {}) },
  mockSpots: persisted.mockSpots || null, // seeded lazily by mock.js
  transcript: [],   // spoken lines (session only)
  route: 'home',    // current screen
  mode: 'collector',
};

const listeners = new Set();

function persist() {
  try {
    globalThis.localStorage?.setItem(
      LS_KEY,
      JSON.stringify({ prefs: state.prefs, mockSpots: state.mockSpots }),
    );
  } catch {
    /* storage may be unavailable (private mode) — run in-memory */
  }
}

export function getState() {
  return state;
}

export function getPrefs() {
  return state.prefs;
}

export function setPrefs(patch) {
  state.prefs = { ...state.prefs, ...patch };
  persist();
  emit();
}

export function setMockSpots(spots) {
  state.mockSpots = spots;
  persist();
}

export function pushTranscript(line) {
  state.transcript.push({ line, at: Date.now() });
  if (state.transcript.length > 60) state.transcript.shift();
  emit('transcript');
}

export function clearTranscript() {
  state.transcript = [];
  emit('transcript');
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(topic = 'state') {
  for (const fn of listeners) fn(topic, state);
}

/** Data export/delete (spec §8: dignity + control). */
export function exportData() {
  return JSON.stringify({ prefs: state.prefs, mockSpots: state.mockSpots }, null, 2);
}

export function deleteData() {
  try {
    globalThis.localStorage?.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
  state.prefs = { ...DEFAULT_PREFS };
  state.mockSpots = null;
  state.transcript = [];
  emit();
}
