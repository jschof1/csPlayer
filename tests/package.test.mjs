import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { createPlayer, csPlayer, loadYouTubeAPI } from '../dist/index.js';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { CSPlayer } from '../dist/react.js';

function setup({ api = true, autoReady = true } = {}) {
  const dom = new JSDOM('<!doctype html><div id="one"></div><div id="two"></div>', { url: 'https://example.test' });
  const players = [];
  const yt = {
    PlayerState: { PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5, ENDED: 0 },
    Player: function(id, options) {
      this.options = options;
      this.playCalls = 0;
      this.getCurrentTime = () => 20;
      this.getDuration = () => 100;
      this.getVideoData = () => ({ title: 'Test video' });
      this.getVideoLoadedFraction = () => .5;
      this.isMuted = () => false;
      this.unMute = () => {};
      this.unloadModule = () => {};
      this.seekTo = () => {};
      this.getAvailableQualityLevels = () => [];
      this.setPlaybackRate = () => { this.rateCalls = (this.rateCalls || 0) + 1; };
      this.loadVideoById = id => { this.videoId = id; };
      this.playVideo = () => { this.playCalls++; options.events.onStateChange({ data: 1 }); };
      this.pauseVideo = () => options.events.onStateChange({ data: 2 });
      this.destroy = () => { this.destroyed = true; };
      this.ready = () => options.events.onReady({ target: this });
      players.push(this);
      if (autoReady) queueMicrotask(this.ready);
    },
  };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.MutationObserver = dom.window.MutationObserver;
  const load = () => { globalThis.YT = dom.window.YT = yt; };
  if (api) load(); else delete globalThis.YT;
  return { dom, players, load, close() { dom.window.close(); delete globalThis.window; delete globalThis.document; delete globalThis.YT; delete globalThis.MutationObserver; } };
}
const options = { videoId: 'M7lc1UVf-VE' };
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('ESM and CommonJS imports are server-safe and do not create globals', () => {
  assert.equal(typeof createRequire(import.meta.url)('../dist/index.cjs').createPlayer, 'function');
  assert.equal(globalThis.csPlayer, undefined);
  assert.equal(globalThis.$, undefined);
  assert.throws(() => createPlayer('#one', options), /browser/);
});

test('independent players, controls, change video, idempotent destroy and remount', async () => {
  const env = setup();
  try {
    const one = createPlayer('#one', options);
    const two = createPlayer(document.querySelector('#two'), { ...options, theme: 'plyr' });
    await Promise.all([one.ready, two.ready]);
    assert.equal(one.getDuration(), 100);
    assert.equal(one.getVideoTitle(), 'Test video');
    one.play(); one.pause();
    assert.equal(one.getPlayerState(), 'paused');
    assert.equal(env.players[0].playCalls, 1);
    assert.equal(env.players[1].playCalls, 0);
    one.changeVideo('dQw4w9WgXcQ');
    assert.equal(env.players[0].videoId, 'dQw4w9WgXcQ');
    // Reopening settings must not duplicate handlers.
    const settings = document.querySelector('#one .settingsBtn');
    settings.click(); settings.click(); settings.click();
    const rate = document.querySelector('#one .csPlayer-settings-box input');
    Object.defineProperty(rate.parentElement, 'innerText', { value: '0.75x' });
    rate.dispatchEvent(new window.Event('change'));
    assert.equal(env.players[0].rateCalls, 1);
    one.destroy(); one.destroy(); two.destroy();
    assert.ok(env.players.every(p => p.destroyed));
    assert.equal(document.querySelector('#one').childNodes.length, 0);
    assert.throws(() => one.play(), /destroyed/);
    const replacement = createPlayer('#one', options);
    await replacement.ready;
    replacement.destroy();
  } finally { env.close(); }
});

test('invalid inputs and occupied targets fail without changing the host', () => {
  const env = setup();
  try {
    assert.throws(() => createPlayer('#one', { videoId: '<img>' }), /video ID/);
    assert.throws(() => createPlayer('#one', { ...options, theme: '" onclick=' }), /theme/);
    assert.throws(() => createPlayer('#missing', options), /connected/);
    document.querySelector('#one').textContent = 'Keep me';
    assert.throws(() => createPlayer('#one', options), /empty/);
    assert.equal(document.querySelector('#one').textContent, 'Keep me');
  } finally { env.close(); }
});

test('destroy before API readiness rejects promptly; late API cannot recreate the player', async () => {
  const env = setup({ api: false });
  try {
    const externalCallback = () => {};
    window.onYouTubeIframeAPIReady = externalCallback;
    const one = createPlayer('#one', options);
    const two = createPlayer('#two', options);
    assert.equal(document.querySelectorAll('script').length, 1);
    one.destroy();
    await assert.rejects(one.ready, /destroyed/);
    env.load();
    await two.ready;
    assert.equal(env.players.length, 1);
    assert.equal(window.onYouTubeIframeAPIReady, externalCallback);
    two.destroy();
  } finally { env.close(); }
});

test('destroy between iframe construction and onReady ignores late events', async () => {
  const env = setup({ autoReady: false });
  try {
    const one = createPlayer('#one', options);
    await tick();
    assert.equal(env.players.length, 1);
    one.destroy();
    await assert.rejects(one.ready, /destroyed/);
    assert.doesNotThrow(() => env.players[0].ready());
    assert.doesNotThrow(() => env.players[0].options.events.onStateChange({ data: 1 }));
    assert.equal(Object.keys(csPlayer.csPlayers).length, 0);
  } finally { env.close(); }
});

test('script error rejects and a subsequent load can retry', async () => {
  const env = setup({ api: false });
  try {
    // The previous successful shared loader is already resolved; isolate a new module instance.
    const { loadYouTubeAPI: load } = await import('../dist/index.js?retry');
    const failed = load();
    document.querySelector('script').dispatchEvent(new window.Event('error'));
    await assert.rejects(failed, /Could not load/);
    assert.equal(document.querySelectorAll('script').length, 0);
    const retried = load();
    env.load();
    await retried;
  } finally { env.close(); }
});

test('React StrictMode, callback updates, prop changes and unmount clean up', async () => {
  const env = setup();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const root = createRoot(document.querySelector('#one'));
  let ready = 0;
  try {
    await act(async () => { root.render(React.createElement(React.StrictMode, null, React.createElement(CSPlayer, { ...options, onReady: () => ready++ }))); await tick(); });
    assert.equal(document.querySelectorAll('.csPlayer').length, 1);
    assert.equal(ready, 1);
    await act(async () => { root.render(React.createElement(React.StrictMode, null, React.createElement(CSPlayer, { ...options, theme: 'plyr', onReady: () => ready++ }))); await tick(); });
    assert.equal(document.querySelectorAll('.csPlayer.theme-plyr').length, 1);
    assert.equal(ready, 2);
    await act(async () => root.unmount());
    assert.equal(Object.keys(csPlayer.csPlayers).length, 0);
    assert.ok(env.players.every(p => p.destroyed));
  } finally { env.close(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; }
});

test('browser bundle exposes only its namespace', () => {
  const dom = new JSDOM('', { runScripts: 'outside-only' });
  try {
    dom.window.eval(readFileSync(new URL('../dist/csPlayer.browser.js', import.meta.url), 'utf8'));
    assert.equal(typeof dom.window.CSPlayer.createPlayer, 'function');
    assert.equal(dom.window.$, undefined);
    assert.equal(dom.window.csPlayer, undefined);
  } finally { dom.window.close(); }
});

test('post-readiness errors reach the consumer callback', async () => {
  const env = setup();
  try {
    const errors = [];
    const player = createPlayer('#one', { ...options, onError: error => errors.push(error.message) });
    await player.ready;
    env.players[0].options.events.onError({ data: 150 });
    assert.deepEqual(errors, ['YouTube player error: 150']);
    player.destroy();
  } finally { env.close(); }
});
