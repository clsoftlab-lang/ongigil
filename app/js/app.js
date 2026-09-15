// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
//
// app.js — shell + router + screens. Collector / Reporter / Helper / Settings /
// Help. Huge accessible UI, Korean-first, one big button. Everything a
// collector needs is operable by ear + one button; every spoken line is also
// shown as an on-screen transcript for hard-of-hearing users.

import { t, loadLang, getLang } from './i18n.js';
import * as store from './state.js';
import * as api from './api.js';
import { Voice } from './voice.js';
import { createGuidance } from './guidance.js';
import { DEMO_ORIGIN } from './mock.js';
import * as wakelock from './wakelock.js';

const $ = (sel, root = document) => root.querySelector(sel);
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null) continue;
    e.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
  }
  return e;
};

let currentSpot = null;
let guidance = null;
let voice = null;

// ---- voice + guidance singletons -------------------------------------------

function initVoice() {
  voice = new Voice({
    onTranscript: (line) => store.pushTranscript(line),
    getPrefs: () => {
      const p = store.getPrefs();
      return { lang: p.voiceLang, rate: p.speechRate, muted: p.muted };
    },
  });
  // Prime voices list (some browsers load async).
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.onvoiceschanged = () => {};
    speechSynthesis.getVoices();
  }
}

// ---- routing ----------------------------------------------------------------

const ROUTES = ['collector', 'reporter', 'helper', 'settings', 'help', 'guide', 'onboard'];

function route() {
  const r = (location.hash || '#/collector').replace(/^#\//, '');
  return ROUTES.includes(r) ? r : 'collector';
}

function go(r) {
  const target = `#/${r}`;
  if (location.hash === target) render(); // same hash won't fire hashchange
  else location.hash = target;
}

// ---- shell ------------------------------------------------------------------

function header() {
  const items = [
    ['collector', 'nav.collector'],
    ['reporter', 'nav.reporter'],
    ['helper', 'nav.helper'],
    ['settings', 'nav.settings'],
    ['help', 'nav.help'],
  ];
  const cur = route();
  return h('header', { class: 'app-header', role: 'banner' },
    h('div', { class: 'brand' },
      h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, '온'),
      h('span', { class: 'brand-name' }, t('app.name')),
      api.isMock() ? h('span', { class: 'demo-badge', role: 'status' }, t('common.demoBadge')) : null,
    ),
    h('nav', { class: 'main-nav', 'aria-label': t('nav.menu') },
      ...items.map(([r, key]) =>
        h('a', {
          href: `#/${r}`,
          class: 'nav-link' + (cur === r ? ' active' : ''),
          'aria-current': cur === r ? 'page' : false,
        }, t(key)),
      ),
    ),
  );
}

// ---- screens ----------------------------------------------------------------

function screenOnboard() {
  return h('main', { class: 'screen onboard', role: 'main' },
    h('h1', {}, t('onboard.title')),
    h('p', { class: 'lead' }, t('onboard.body')),
    h('p', { class: 'privacy-note' }, t('onboard.privacy')),
    h('button', {
      class: 'btn-giant',
      onclick: () => { store.setPrefs({ onboarded: true }); go('collector'); },
    }, t('onboard.start')),
  );
}

function screenCollector() {
  const main = h('main', { class: 'screen collector', role: 'main' },
    h('button', {
      class: 'btn-giant primary',
      'aria-describedby': 'start-hint',
      onclick: startNearest,
    },
      h('span', { class: 'giant-icon', 'aria-hidden': 'true' }, '🔊'),
      h('span', {}, t('collector.start')),
    ),
    h('p', { id: 'start-hint', class: 'hint' }, t('collector.startHint')),
    h('section', { class: 'nearest', 'aria-live': 'polite' },
      h('h2', {}, t('collector.nearestTitle')),
      h('div', { id: 'nearest-list', class: 'rows' }, h('p', { class: 'muted' }, t('collector.locating'))),
      h('button', { class: 'btn-wide', onclick: refreshNearest }, t('collector.refresh')),
    ),
  );
  setTimeout(refreshNearest, 30);
  return main;
}

async function currentOriginOrDemo() {
  // Demo mode always walks from the demo origin so the voice can be heard.
  if (api.isMock()) return DEMO_ORIGIN;
  try {
    const s = await import('./sensors.js');
    return await s.getCurrentPosition();
  } catch {
    return DEMO_ORIGIN;
  }
}

async function refreshNearest() {
  const list = $('#nearest-list');
  if (!list) return;
  list.replaceChildren(h('p', { class: 'muted' }, t('collector.locating')));
  try {
    const origin = await currentOriginOrDemo();
    const spots = await api.nearbySpots(origin, 2000);
    if (!spots.length) {
      list.replaceChildren(h('p', { class: 'muted big' }, t('collector.noSpots')));
      return;
    }
    const { compassWord, formatDistance } = await import('./geo.js');
    list.replaceChildren(
      ...spots.slice(0, 6).map((s) =>
        h('button', { class: 'spot-row', onclick: () => startGuidance(s) },
          h('span', { class: 'spot-arrow', 'aria-hidden': 'true', style: `--b:${Math.round(s.bearing)}deg` }, '↑'),
          h('span', { class: 'spot-main' },
            h('span', { class: 'spot-dir' }, compassWord(s.bearing, getLang())),
            h('span', { class: 'spot-kind' }, t(`reporter.${s.kind}`) + (s.note ? ' · ' + s.note : '')),
          ),
          h('span', { class: 'spot-dist' }, formatDistance(s.distance), h('small', {}, ' ' + t('collector.meters'))),
          h('span', { class: 'spot-go' }, t('collector.guideBtn')),
        ),
      ),
    );
  } catch (e) {
    list.replaceChildren(h('p', { class: 'muted' }, t('collector.noSpots')));
    console.warn('nearby failed', e);
  }
}

async function startNearest() {
  const origin = await currentOriginOrDemo();
  const spots = await api.nearbySpots(origin, 5000);
  if (!spots.length) {
    voice?.say(t('voice.quietSpot'), { urgent: true });
    refreshNearest();
    return;
  }
  startGuidance(spots[0]);
}

async function startGuidance(spot) {
  currentSpot = spot;
  go('guide');
  // wait for the guide screen to render, then run the loop
  setTimeout(async () => {
    if (store.getPrefs().keepScreenOn) wakelock.enable();
    guidance = createGuidance({
      voice,
      t,
      getLang,
      onUpdate: renderGuideUpdate,
      onArrive: () => {},
    });
    if (api.isMock()) guidance.startDemo(spot, await currentOriginOrDemo());
    else guidance.startReal(spot);
  }, 40);
}

function screenGuide() {
  if (!currentSpot) { setTimeout(() => go('collector'), 0); return h('main', { class: 'screen' }); }
  const main = h('main', { class: 'screen guide', role: 'main' },
    h('div', { class: 'guide-top' },
      h('div', { class: 'arrow-wrap', role: 'img', 'aria-label': t('guide.title') },
        h('div', { id: 'guide-arrow', class: 'big-arrow', 'aria-hidden': 'true' }, '⬆'),
      ),
      h('div', { class: 'dist-wrap' },
        h('div', { id: 'guide-dist', class: 'dist-number', 'aria-live': 'assertive' }, '…'),
        h('div', { class: 'dist-unit' }, t('guide.distanceUnit')),
        h('div', { id: 'guide-dir', class: 'dir-word' }, ''),
      ),
    ),
    h('p', { class: 'screen-on-note', role: 'note' },
      h('span', { 'aria-hidden': 'true' }, '💡 '), t('guide.screenOnNote')),
    h('div', { class: 'guide-actions' },
      h('button', { class: 'btn-big ok', onclick: () => finishGuide('taken') }, t('guide.arrived')),
      h('button', { class: 'btn-big warn', onclick: () => finishGuide('not_there') }, t('guide.notHere')),
      h('button', { class: 'btn-big', onclick: () => voice?.repeat() }, t('guide.repeat')),
      h('button', { id: 'mute-btn', class: 'btn-big', onclick: toggleMute },
        store.getPrefs().muted ? t('guide.unmute') : t('guide.mute')),
      h('button', { class: 'btn-big stop', onclick: () => finishGuide(null) }, t('guide.stop')),
    ),
    h('section', { class: 'transcript', 'aria-label': t('guide.transcriptTitle') },
      h('h2', {}, t('guide.transcriptTitle')),
      h('ul', { id: 'transcript-list', class: 'transcript-list', 'aria-live': 'polite' }),
    ),
  );
  setTimeout(renderTranscript, 20);
  return main;
}

function renderGuideUpdate(u) {
  const distEl = $('#guide-dist');
  const dirEl = $('#guide-dir');
  const arrowEl = $('#guide-arrow');
  if (distEl) distEl.textContent = u.distanceText;
  if (dirEl) dirEl.textContent = u.compass + (u.arrivalState === 'almost' ? ' · ' + t('voice.almost') : '');
  if (arrowEl) {
    const deg = u.relativeAngle != null ? u.relativeAngle : u.bearing;
    arrowEl.style.transform = `rotate(${deg}deg)`;
  }
}

function renderTranscript() {
  const ul = $('#transcript-list');
  if (!ul) return;
  const lines = store.getState().transcript.slice(-12).reverse();
  ul.replaceChildren(...lines.map((x) => h('li', {}, x.line)));
}

function toggleMute() {
  const muted = !store.getPrefs().muted;
  store.setPrefs({ muted });
  const b = $('#mute-btn');
  if (b) b.textContent = muted ? t('guide.unmute') : t('guide.mute');
  if (muted) voice?.stop();
}

async function finishGuide(kind) {
  guidance?.stop();
  wakelock.disable();
  if (kind && currentSpot) {
    try { await api.feedback(currentSpot.id, kind); } catch { /* offline ok */ }
    voice?.say(kind === 'taken' ? t('guide.thanksTaken') : t('guide.markedGone'), { urgent: true });
  } else {
    voice?.stop();
  }
  currentSpot = null;
  go('collector');
}

// ---- reporter ---------------------------------------------------------------

const reportDraft = { size: 'medium', kind: 'mixed', ttlMin: 120 };

function screenReporter() {
  return h('main', { class: 'screen reporter', role: 'main' },
    h('h1', {}, t('reporter.title')),
    h('button', { class: 'btn-giant report', onclick: captureReport },
      h('span', { class: 'giant-icon', 'aria-hidden': 'true' }, '📦'),
      h('span', {}, t('reporter.big')),
    ),
    h('p', { class: 'hint' }, t('reporter.hint')),
    chipGroup('reporter.amount', 'size', [['small', 'reporter.small'], ['medium', 'reporter.medium'], ['large', 'reporter.large']]),
    chipGroup('reporter.kind', 'kind', [['paper', 'reporter.paper'], ['box', 'reporter.box'], ['mixed', 'reporter.mixed']]),
    chipGroup('reporter.until', 'ttlMin', [[120, 'reporter.until2h'], [600, 'reporter.until6pm']]),
    h('p', { class: 'privacy-note' }, h('span', { 'aria-hidden': 'true' }, '🔒 '), t('reporter.privacy')),
    h('div', { id: 'report-result', 'aria-live': 'assertive' }),
  );
}

function chipGroup(labelKey, field, opts) {
  return h('fieldset', { class: 'chip-group' },
    h('legend', {}, t(labelKey)),
    ...opts.map(([val, key]) =>
      h('button', {
        class: 'chip' + (reportDraft[field] === val ? ' selected' : ''),
        'aria-pressed': reportDraft[field] === val ? 'true' : 'false',
        onclick: (ev) => {
          reportDraft[field] = val;
          const grp = ev.target.closest('.chip-group');
          grp.querySelectorAll('.chip').forEach((c) => { c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
          ev.target.classList.add('selected');
          ev.target.setAttribute('aria-pressed', 'true');
        },
      }, t(key)),
    ),
  );
}

async function captureReport() {
  const box = $('#report-result');
  box.replaceChildren(h('p', { class: 'muted' }, t('reporter.capturing')));
  let pos = DEMO_ORIGIN;
  try {
    if (!api.isMock()) {
      const s = await import('./sensors.js');
      pos = await s.getCurrentPosition();
    } else {
      // demo: scatter new reports a little around the origin so they're findable
      const g = await import('./geo.js');
      pos = g.destinationPoint(DEMO_ORIGIN.lat, DEMO_ORIGIN.lng, Math.random() * 360, 40 + Math.random() * 150);
    }
  } catch { pos = DEMO_ORIGIN; }
  try {
    await api.reportSpot({ ...pos, ...reportDraft });
    box.replaceChildren(
      h('div', { class: 'thanks' },
        h('div', { class: 'thanks-mark', 'aria-hidden': 'true' }, '💛'),
        h('h2', {}, t('reporter.thanks')),
        h('p', {}, t('reporter.thanksBody')),
        h('button', { class: 'btn-wide', onclick: () => { box.replaceChildren(); } }, t('reporter.addMore')),
      ),
    );
  } catch (e) {
    box.replaceChildren(h('p', { class: 'muted' }, String(e.message || e)));
  }
}

// ---- helper -----------------------------------------------------------------

function screenHelper() {
  return h('main', { class: 'screen helper', role: 'main' },
    h('h1', {}, t('helper.title')),
    h('p', { class: 'lead' }, t('helper.body')),
    h('button', { class: 'btn-wide', onclick: () => go('reporter') }, t('helper.reportOnBehalf')),
    h('button', { class: 'btn-wide', onclick: () => go('settings') }, t('helper.setPrefs')),
    h('section', { class: 'howto' },
      h('h2', {}, t('helper.howto')),
      h('p', { class: 'big' }, t('helper.howtoBody')),
    ),
  );
}

// ---- settings ---------------------------------------------------------------

function screenSettings() {
  const p = store.getPrefs();
  return h('main', { class: 'screen settings', role: 'main' },
    h('h1', {}, t('settings.title')),

    row(t('settings.voiceLang'),
      segmented([['ko', 'settings.korean'], ['en', 'settings.english']], p.voiceLang, async (v) => {
        store.setPrefs({ voiceLang: v });
        await loadLang(v);
        render();
      })),

    row(t('settings.speechRate'),
      h('div', { class: 'slider-wrap' },
        h('span', { class: 'slider-end' }, t('settings.slow')),
        h('input', {
          type: 'range', min: '0.6', max: '1.4', step: '0.1', value: String(p.speechRate),
          'aria-label': t('settings.speechRate'),
          oninput: (e) => store.setPrefs({ speechRate: parseFloat(e.target.value) }),
        }),
        h('span', { class: 'slider-end' }, t('settings.fast')),
      )),

    row(t('settings.textSize'),
      segmented([['large', 'settings.large'], ['xlarge', 'settings.xlarge']], p.textSize, (v) => {
        store.setPrefs({ textSize: v });
        applyTextSize();
      })),

    row(t('settings.keepScreenOn'),
      toggle(p.keepScreenOn, (v) => store.setPrefs({ keepScreenOn: v }))),

    h('button', { class: 'btn-wide', onclick: () => voice?.say(t('voice.almost'), { urgent: true }) }, t('settings.testVoice')),

    h('div', { class: 'field' },
      h('label', { for: 'api-base' }, t('settings.apiBase')),
      h('input', {
        id: 'api-base', type: 'url', value: p.apiBaseUrl, placeholder: 'https://…',
        oninput: (e) => store.setPrefs({ apiBaseUrl: e.target.value.trim() }),
      }),
      h('p', { class: 'hint' }, t('settings.apiHint')),
    ),

    h('p', { class: 'map-note', role: 'note' }, t('settings.mapNote')),

    h('div', { class: 'settings-data' },
      h('button', { class: 'btn-wide', onclick: exportData }, t('settings.export')),
      h('button', { class: 'btn-wide danger', onclick: deleteData }, t('settings.delete')),
    ),
  );
}

function row(label, control) {
  return h('div', { class: 'setting-row' }, h('span', { class: 'setting-label' }, label), control);
}
function segmented(opts, value, onchange) {
  return h('div', { class: 'segmented', role: 'group' },
    ...opts.map(([v, key]) =>
      h('button', {
        class: 'seg' + (value === v ? ' selected' : ''),
        'aria-pressed': value === v ? 'true' : 'false',
        onclick: () => onchange(v),
      }, t(key)),
    ),
  );
}
function toggle(value, onchange) {
  const b = h('button', {
    class: 'switch' + (value ? ' on' : ''),
    role: 'switch',
    'aria-checked': value ? 'true' : 'false',
    onclick: () => {
      const nv = b.getAttribute('aria-checked') !== 'true';
      b.setAttribute('aria-checked', nv ? 'true' : 'false');
      b.classList.toggle('on', nv);
      b.querySelector('.switch-label').textContent = nv ? t('common.on') : t('common.off');
      onchange(nv);
    },
  }, h('span', { class: 'switch-knob', 'aria-hidden': 'true' }), h('span', { class: 'switch-label' }, value ? t('common.on') : t('common.off')));
  return b;
}

function exportData() {
  const data = store.exportData();
  const box = h('textarea', { class: 'export-box', readonly: true, 'aria-label': t('settings.export') }, data);
  const dlg = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' },
    box,
    h('button', { class: 'btn-wide', onclick: () => dlg.remove() }, t('common.close')),
  );
  document.body.appendChild(dlg);
}
function deleteData() {
  if (confirm(t('settings.deleteConfirm'))) { store.deleteData(); loadLang(store.getPrefs().voiceLang).then(render); }
}

// ---- help -------------------------------------------------------------------

function screenHelp() {
  return h('main', { class: 'screen help', role: 'main' },
    h('h1', {}, t('help.title')),
    section(t('help.safety'), t('help.safetyBody'), '⚠️'),
    section(t('help.privacyTitle'), t('help.privacyBody'), '🔒'),
    section(t('help.about'), t('help.aboutBody'), '💛'),
    h('p', { class: 'credits' }, t('help.credits')),
    h('p', { class: 'hint' }, t('common.installHint')),
  );
}
function section(title, body, icon) {
  return h('section', { class: 'help-section' },
    h('h2', {}, h('span', { 'aria-hidden': 'true' }, icon + ' '), title),
    h('p', { class: 'big' }, body),
  );
}

// ---- render -----------------------------------------------------------------

function screenFor(r) {
  switch (r) {
    case 'onboard': return screenOnboard();
    case 'collector': return screenCollector();
    case 'reporter': return screenReporter();
    case 'helper': return screenHelper();
    case 'settings': return screenSettings();
    case 'help': return screenHelp();
    case 'guide': return screenGuide();
    default: return screenCollector();
  }
}

function render() {
  const root = $('#app');
  if (!root) return;
  let r = route();
  if (r === 'collector' && !store.getPrefs().onboarded) r = 'onboard';
  root.replaceChildren(header(), screenFor(r));
  document.title = `${t('app.name')} — ${t('app.tagline')}`;
}

function applyTextSize() {
  document.body.classList.toggle('size-xlarge', store.getPrefs().textSize === 'xlarge');
}

// ---- boot -------------------------------------------------------------------

async function boot() {
  initVoice();
  await loadLang(store.getPrefs().voiceLang);
  applyTextSize();
  window.addEventListener('hashchange', () => {
    // leaving guide stops guidance
    if (route() !== 'guide' && guidance) { guidance.stop(); wakelock.disable(); }
    render();
  });
  store.subscribe((topic) => { if (topic === 'transcript' && route() === 'guide') renderTranscript(); });
  if (!location.hash) location.hash = '#/collector';
  render();

  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('./sw.js'); } catch { /* offline still fine */ }
  }
}

document.addEventListener('DOMContentLoaded', boot);
