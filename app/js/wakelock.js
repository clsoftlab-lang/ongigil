// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
//
// wakelock.js — keep the screen on during guidance (spec §6). We are HONEST:
// a PWA cannot reliably speak with the screen fully off, so we hold a wake lock
// and re-acquire it when the tab becomes visible again. `supported` lets the UI
// state the limitation plainly.

let _lock = null;
let _wantOn = false;
let _visHandler = null;

export const supported =
  typeof navigator !== 'undefined' && 'wakeLock' in navigator;

export async function enable() {
  _wantOn = true;
  if (!supported) return false;
  try {
    _lock = await navigator.wakeLock.request('screen');
    _lock.addEventListener?.('release', () => {
      _lock = null;
    });
    if (!_visHandler) {
      _visHandler = async () => {
        if (_wantOn && document.visibilityState === 'visible' && !_lock) {
          try {
            _lock = await navigator.wakeLock.request('screen');
          } catch {
            /* ignore */
          }
        }
      };
      document.addEventListener('visibilitychange', _visHandler);
    }
    return true;
  } catch {
    return false;
  }
}

export async function disable() {
  _wantOn = false;
  try {
    await _lock?.release?.();
  } catch {
    /* ignore */
  }
  _lock = null;
  if (_visHandler) {
    document.removeEventListener('visibilitychange', _visHandler);
    _visHandler = null;
  }
}
