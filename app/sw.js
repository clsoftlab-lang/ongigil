// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
//
// sw.js — offline-first service worker. Precaches the app shell so guidance to a
// chosen spot works with no network (spec §9). App logic (API calls) still runs
// against the mock when there is no backend, so the whole PWA is usable offline.

const CACHE = 'ongigil-v1';
const SHELL = [
  './',
  './index.html',
  './css/style.css',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/app.js',
  './js/api.js',
  './js/mock.js',
  './js/geo.js',
  './js/voice.js',
  './js/sensors.js',
  './js/guidance.js',
  './js/wakelock.js',
  './js/state.js',
  './js/i18n.js',
  './i18n/ko.json',
  './i18n/en.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return; // never cache reports/feedback
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let cross-origin API pass through

  // Cache-first for our own shell/assets, with a network fallback that fills cache.
  e.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    }),
  );
});
