// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
//
// i18n.js — Korean-first, warm, short sentences. Loads ko/en JSON, does simple
// {placeholder} substitution, and falls back to the key (never breaks the UI).

let dict = {};
let currentLang = 'ko';
const cache = {};

/** Load a language bundle from /i18n/<lang>.json. Browser only. */
export async function loadLang(lang) {
  const l = lang === 'en' ? 'en' : 'ko';
  if (!cache[l]) {
    const res = await fetch(new URL(`../i18n/${l}.json`, import.meta.url));
    cache[l] = await res.json();
  }
  dict = cache[l];
  currentLang = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
  return dict;
}

export function getLang() {
  return currentLang;
}

/** For tests / direct use: install an already-parsed dictionary. */
export function setDict(obj, lang = 'ko') {
  dict = obj || {};
  currentLang = lang;
}

/** Translate `key`, substituting {name} placeholders from `params`. */
export function t(key, params = {}) {
  let s = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key;
  return s.replace(/\{(\w+)\}/g, (m, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : m,
  );
}
