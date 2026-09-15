// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
//
// sensors.js — Geolocation watch + DeviceOrientation compass, with the iOS
// permission request and a graceful fallback to heading-from-movement when no
// compass is present (spec §4). Browser only; guarded for Node import.

import { bearing } from './geo.js';

export function geoAvailable() {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

/**
 * Watch position. Calls onPosition({lat,lng,accuracy}) on each fix.
 * Returns a stop() function.
 */
export function watchPosition(onPosition, onError) {
  if (!geoAvailable()) {
    onError?.(new Error('geolocation unavailable'));
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (p) => onPosition({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
    (e) => onError?.(e),
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!geoAvailable()) return reject(new Error('geolocation unavailable'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      reject,
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });
}

/**
 * Ask for compass permission where required (iOS 13+ gesture-gated).
 * Returns true if we may listen for orientation events.
 */
export async function requestCompassPermission() {
  const DOE = typeof globalThis !== 'undefined' ? globalThis.DeviceOrientationEvent : undefined;
  if (DOE && typeof DOE.requestPermission === 'function') {
    try {
      const res = await DOE.requestPermission();
      return res === 'granted';
    } catch {
      return false;
    }
  }
  // Non-iOS: available without an explicit prompt (if the device has a compass).
  return typeof globalThis !== 'undefined' && 'DeviceOrientationEvent' in globalThis;
}

/**
 * Start a compass. Calls onHeading(deg 0..360). Returns stop().
 * If no compass fires within `fallbackMs`, the caller should fall back to
 * heading-from-movement (see headingFromMovement).
 */
export function watchHeading(onHeading) {
  if (typeof globalThis === 'undefined' || !('addEventListener' in globalThis)) return () => {};
  const handler = (e) => {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading; // iOS: already true-north
    else if (typeof e.alpha === 'number') h = 360 - e.alpha; // Android: alpha CCW from north
    if (h != null && !Number.isNaN(h)) onHeading(((h % 360) + 360) % 360);
  };
  globalThis.addEventListener('deviceorientationabsolute', handler, true);
  globalThis.addEventListener('deviceorientation', handler, true);
  return () => {
    globalThis.removeEventListener('deviceorientationabsolute', handler, true);
    globalThis.removeEventListener('deviceorientation', handler, true);
  };
}

/** Fallback heading: bearing between two consecutive GPS fixes while walking. */
export function headingFromMovement(prev, curr, minMoveM = 4) {
  if (!prev || !curr) return null;
  const R = 6371000;
  const dφ = ((curr.lat - prev.lat) * Math.PI) / 180;
  const dλ = ((curr.lng - prev.lng) * Math.PI) / 180;
  const meanLat = ((curr.lat + prev.lat) / 2) * (Math.PI / 180);
  const dist = R * Math.hypot(dφ, dλ * Math.cos(meanLat));
  if (dist < minMoveM) return null; // too small to trust
  return bearing(prev.lat, prev.lng, curr.lat, curr.lng);
}
