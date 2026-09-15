// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setDict, t } from '../js/i18n.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const load = (l) => JSON.parse(readFileSync(join(HERE, `../i18n/${l}.json`), 'utf8'));
const ko = load('ko');
const en = load('en');
const placeholders = (s) => (String(s).match(/\{(\w+)\}/g) || []).sort();

test('ko and en have exactly the same keys', () => {
  const kk = Object.keys(ko).sort();
  const ek = Object.keys(en).sort();
  const missingInEn = kk.filter((k) => !(k in en));
  const missingInKo = ek.filter((k) => !(k in ko));
  assert.deepEqual(missingInEn, [], `missing in en: ${missingInEn}`);
  assert.deepEqual(missingInKo, [], `missing in ko: ${missingInKo}`);
});

test('every key has matching {placeholders} across languages', () => {
  for (const k of Object.keys(ko)) {
    assert.deepEqual(placeholders(ko[k]), placeholders(en[k]), `placeholder mismatch for ${k}`);
  }
});

test('no empty strings', () => {
  for (const [k, v] of Object.entries(ko)) assert.ok(String(v).trim().length > 0, `empty ko ${k}`);
  for (const [k, v] of Object.entries(en)) assert.ok(String(v).trim().length > 0, `empty en ${k}`);
});

test('t(): substitutes placeholders and falls back to key when missing', () => {
  setDict({ 'voice.update': '{dir} {dist} 미터' }, 'ko');
  assert.equal(t('voice.update', { dir: '북동쪽', dist: 80 }), '북동쪽 80 미터');
  assert.equal(t('no.such.key'), 'no.such.key'); // graceful fallback
});

test('critical voice keys carry the expected placeholders', () => {
  assert.deepEqual(placeholders(ko['voice.update']), ['{dir}', '{dist}']);
  assert.deepEqual(placeholders(ko['voice.startGuiding']), ['{dir}', '{dist}']);
  assert.deepEqual(placeholders(ko['voice.countdown']), ['{n}']);
});
