// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
//
// guidance.js — the heart. Ties sensors + geo + voice into one loop: pick the
// target, speak direction + distance, keep speaking as the collector moves,
// and on arrival prompt taken / not-there. Works in DEMO mode (simulated walk,
// no GPS) and REAL mode (Geolocation + compass, with movement-heading fallback).

import {
  haversine,
  bearing as bearingOf,
  compassWord,
  relativeTurn,
  closerFarther,
  arrivalState,
  formatDistance,
} from './geo.js';
import { createCalloutPlanner } from './voice.js';
import { simulateWalk, DEMO_ORIGIN } from './mock.js';
import * as sensors from './sensors.js';

/**
 * @param {object} o
 * @param {import('./voice.js').Voice} o.voice
 * @param {(key:string,params?:object)=>string} o.t
 * @param {()=>string} o.getLang
 * @param {(u:object)=>void} o.onUpdate   per-tick UI update
 * @param {(spot:object)=>void} o.onArrive
 */
export function createGuidance({ voice, t, getLang, onUpdate = () => {}, onArrive = () => {} }) {
  let target = null;
  let heading = null;       // degrees, or null if no compass yet
  let prevPos = null;
  let prevDist = null;
  let planner = null;
  let saidAlmost = false;
  let arrived = false;
  let stopWalk = null;      // demo timer / real watcher teardown
  let stopHeading = null;

  function reset(spot) {
    target = spot;
    heading = null;
    prevPos = null;
    prevDist = null;
    planner = createCalloutPlanner();
    saidAlmost = false;
    arrived = false;
  }

  function dirWord(brg, lang) {
    if (heading != null) return relativeTurn(brg, heading, lang).text;
    return compassWord(brg, lang);
  }

  function handlePosition(pos) {
    if (!target || arrived) return;
    const lang = getLang();
    const dist = haversine(pos.lat, pos.lng, target.lat, target.lng);
    const brg = bearingOf(pos.lat, pos.lng, target.lat, target.lng);

    // Fallback heading from movement when there is no compass.
    if (heading == null && prevPos) {
      const mh = sensors.headingFromMovement(prevPos, pos);
      if (mh != null) heading = mh;
    }

    const rel = heading != null ? ((brg - heading + 540) % 360) - 180 : null;
    const state = arrivalState(dist);

    onUpdate({
      distance: dist,
      distanceText: formatDistance(dist),
      bearing: brg,
      relativeAngle: rel,           // null => arrow is north-up (compass)
      compass: compassWord(brg, lang),
      arrivalState: state,
      hasHeading: heading != null,
    });

    if (state === 'arrived') {
      arrived = true;
      voice.say(t('voice.arrived'), { urgent: true });
      teardown();
      onArrive(target);
      return;
    }

    if (state === 'almost' && !saidAlmost) {
      saidAlmost = true;
      voice.say(t('voice.almost'), { urgent: true });
    }

    const n = planner.update(dist);
    if (n != null) {
      if (dist <= 50) {
        // countdown band — short number cue, keeps a pocketed phone useful
        voice.say(t('voice.countdown', { n }));
      } else {
        const line = t('voice.update', { dir: dirWord(brg, lang), dist: formatDistance(dist) });
        const trend = closerFarther(prevDist, dist, lang);
        // Warn only when going the WRONG way; don't chatter "closer".
        voice.say(trend && trend.key === 'farther' ? `${line}, ${trend.text}` : line);
      }
    }

    prevPos = pos;
    prevDist = dist;
  }

  function teardown() {
    if (stopWalk) { stopWalk(); stopWalk = null; }
    if (stopHeading) { stopHeading(); stopHeading = null; }
  }

  return {
    /** DEMO: simulate a walk from origin → spot so the voice can be heard. */
    startDemo(spot, origin = DEMO_ORIGIN, { tickMs = 650 } = {}) {
      teardown();
      reset(spot);
      const lang = getLang();
      const brg0 = bearingOf(origin.lat, origin.lng, spot.lat, spot.lng);
      voice.say(t('voice.startGuiding', {
        dir: compassWord(brg0, lang),
        dist: formatDistance(haversine(origin.lat, origin.lng, spot.lat, spot.lng)),
      }), { urgent: true });

      const path = simulateWalk(origin, spot);
      let i = 0;
      const id = setInterval(() => {
        if (i >= path.length || arrived) { teardown(); return; }
        handlePosition(path[i]);
        i += 1;
      }, tickMs);
      stopWalk = () => clearInterval(id);
      return this;
    },

    /** REAL: Geolocation + compass (or movement heading). */
    async startReal(spot) {
      teardown();
      reset(spot);
      try {
        const granted = await sensors.requestCompassPermission();
        if (granted) stopHeading = sensors.watchHeading((h) => { heading = h; });
      } catch { /* no compass — movement fallback kicks in */ }

      const lang = getLang();
      try {
        const p0 = await sensors.getCurrentPosition();
        const brg0 = bearingOf(p0.lat, p0.lng, spot.lat, spot.lng);
        voice.say(t('voice.startGuiding', {
          dir: compassWord(brg0, lang),
          dist: formatDistance(haversine(p0.lat, p0.lng, spot.lat, spot.lng)),
        }), { urgent: true });
        handlePosition(p0);
      } catch { /* first fix may fail; watch will provide one */ }

      stopWalk = sensors.watchPosition(
        (p) => handlePosition(p),
        () => {},
      );
      return this;
    },

    setHeading(h) { heading = h; },
    stop() { teardown(); arrived = true; },
    isArrived() { return arrived; },
    target() { return target; },
  };
}
