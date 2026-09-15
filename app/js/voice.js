// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
//
// voice.js — spoken guidance for the ears.
// Two PURE cores (unit-tested, no browser needed):
//   • createQueue()          — a speech queue that NEVER floods (bounded,
//                              dedups consecutive lines, urgent bypass).
//   • createCalloutPlanner() — decides which distance numbers to speak,
//                              with a countdown under 50 m.
// And a thin Voice wrapper around Web Speech `speechSynthesis` that is safe to
// import in Node (guards on `typeof`), always mirroring spoken text to an
// on-screen transcript for hard-of-hearing users and debugging.

// ---- Pure: bounded, non-flooding speech queue -------------------------------

/**
 * @param {object} o
 * @param {number} [o.maxPending=3]  Max queued (non-urgent) items.
 */
export function createQueue({ maxPending = 3 } = {}) {
  /** @type {{text:string, urgent:boolean}[]} */
  let items = [];
  return {
    get pending() {
      return items.length;
    },
    /** Add a line. Returns true if accepted, false if dropped as a flood. */
    enqueue(text, { urgent = false } = {}) {
      if (!text) return false;
      // Never say the same line twice in a row.
      const last = items[items.length - 1];
      if (last && last.text === text) return false;
      if (urgent) {
        // Urgent (arrival, "stop") jumps the queue and clears chatter.
        items = items.filter((it) => it.urgent);
        items.push({ text, urgent: true });
        return true;
      }
      if (items.length >= maxPending) {
        // Full: drop the OLDEST non-urgent line so newest info wins, no pile-up.
        const idx = items.findIndex((it) => !it.urgent);
        if (idx === -1) return false; // only urgent queued — keep them
        items.splice(idx, 1);
      }
      items.push({ text, urgent: false });
      return true;
    },
    /** Pop the next line to speak, or null. */
    next() {
      return items.shift() || null;
    },
    clear() {
      items = [];
    },
    peek() {
      return items.slice();
    },
  };
}

// ---- Pure: distance callout planner (countdown under 50 m) -------------------

export const COUNTDOWN_THRESHOLDS = [50, 40, 30, 20, 10, 5];

/**
 * Emits a distance number to speak only when it is worth saying:
 *   • above 50 m — every `stepMeters` of change,
 *   • at/under 50 m — each countdown threshold crossed on the way down.
 * @returns object with update(distanceM) -> number|null and reset().
 */
export function createCalloutPlanner({ stepMeters = 20, thresholds = COUNTDOWN_THRESHOLDS } = {}) {
  const sorted = [...thresholds].sort((a, b) => b - a); // high → low
  let lastAnnounced = null; // metres last spoken
  let firedBelow = new Set(); // thresholds already announced
  return {
    reset() {
      lastAnnounced = null;
      firedBelow = new Set();
    },
    /** @param {number} distanceM @returns {number|null} number to speak */
    update(distanceM) {
      const top = sorted[0];
      if (distanceM > top) {
        if (lastAnnounced == null || Math.abs(distanceM - lastAnnounced) >= stepMeters) {
          lastAnnounced = distanceM;
          return Math.round(distanceM / 10) * 10;
        }
        return null;
      }
      // At/under the countdown band: announce the highest not-yet-fired
      // threshold that we are now below.
      for (const t of sorted) {
        if (distanceM <= t && !firedBelow.has(t)) {
          firedBelow.add(t);
          lastAnnounced = distanceM;
          return t;
        }
      }
      return null;
    },
  };
}

// ---- Browser wrapper (safe to import in Node) -------------------------------

export class Voice {
  /**
   * @param {object} o
   * @param {(line:string)=>void} [o.onTranscript]  called for EVERY spoken line
   * @param {()=>{lang:string, rate:number, muted:boolean}} [o.getPrefs]
   */
  constructor({ onTranscript = () => {}, getPrefs = () => ({ lang: 'ko', rate: 1, muted: false }) } = {}) {
    this.onTranscript = onTranscript;
    this.getPrefs = getPrefs;
    this.queue = createQueue({ maxPending: 3 });
    this.speaking = false;
    this._lastLine = '';
    this.supported =
      typeof globalThis !== 'undefined' &&
      typeof globalThis.speechSynthesis !== 'undefined' &&
      typeof globalThis.SpeechSynthesisUtterance !== 'undefined';
  }

  /** Queue a line; it is always mirrored to the transcript even if muted/silent. */
  say(text, { urgent = false } = {}) {
    if (!text) return;
    this._lastLine = text;
    this.onTranscript(text);
    this.queue.enqueue(text, { urgent });
    this._pump();
  }

  /** Re-speak the last line (the big "다시 듣기" button). */
  repeat() {
    if (this._lastLine) this.say(this._lastLine, { urgent: true });
  }

  _pickVoice(lang) {
    if (!this.supported) return null;
    const voices = globalThis.speechSynthesis.getVoices() || [];
    const pref = lang === 'en' ? 'en' : 'ko';
    return (
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(pref)) ||
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ko')) ||
      voices[0] ||
      null
    );
  }

  _pump() {
    if (!this.supported || this.speaking) return;
    const prefs = this.getPrefs();
    if (prefs.muted) {
      // Muted: drain the queue silently (transcript already shown).
      this.queue.clear();
      return;
    }
    const item = this.queue.next();
    if (!item) return;
    const u = new globalThis.SpeechSynthesisUtterance(item.text);
    u.lang = prefs.lang === 'en' ? 'en-US' : 'ko-KR';
    u.rate = Math.max(0.5, Math.min(1.5, prefs.rate || 1));
    const v = this._pickVoice(prefs.lang);
    if (v) u.voice = v;
    this.speaking = true;
    u.onend = u.onerror = () => {
      this.speaking = false;
      this._pump();
    };
    try {
      globalThis.speechSynthesis.speak(u);
    } catch {
      this.speaking = false;
    }
  }

  stop() {
    this.queue.clear();
    this.speaking = false;
    if (this.supported) {
      try {
        globalThis.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
  }
}
