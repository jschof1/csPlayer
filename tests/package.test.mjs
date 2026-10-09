import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { createPlayer } from '../dist/index.js';
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
      this.time = 20;
      this.getCurrentTime = () => this.time;
      this.getDuration = () => 100;
      this.getVideoData = () => ({ title: 'Test video' });
      this.getVideoLoadedFraction = () => .5;
      this.isMuted = () => false;
      this.unMute = () => {};
      this.unloadModule = () => {};
      this.seekTo = time => { this.time = time; };
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
    one.setControls('standard');
    const rate = document.querySelector('#one [aria-label="Playback speed"]');
    rate.value = '0.75';
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
    assert.equal(document.querySelectorAll('.csPlayer').length, 0);
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
    assert.equal(document.querySelectorAll('.csPlayer').length, 0);
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

test('minimal mode pauses on a single surface click and resumes with the same button', async () => {
  const env = setup();
  try {
    const player = createPlayer('#one', options);
    await player.ready;
    const surface = document.querySelector('#one .csp-surface');
    surface.click();
    assert.equal(player.getPlayerState(), 'playing');
    surface.click();
    assert.equal(player.getPlayerState(), 'paused');
    assert.equal(document.querySelector('#one .csp-toolbar').hidden, true);
    assert.equal(document.querySelector('#one .csp-center').hidden, false);
    surface.click();
    assert.equal(player.getPlayerState(), 'playing');
    player.destroy();
  } finally { env.close(); }
});

test('live control changes retain playback and do not construct another iframe', async () => {
  const env = setup();
  try {
    const player = createPlayer('#one', options);
    await player.ready;
    player.play();
    for (const visibility of ['always', 'auto', 'hidden']) {
      player.setControls({ visibility, progress: false, time: false, skip: true });
      assert.equal(document.querySelector('#one .csp-seek').hidden, true);
      assert.equal(document.querySelector('#one .csp-time').hidden, true);
      assert.equal(document.querySelector('#one [data-control="skip"]').hidden, false);
      assert.equal(player.getPlayerState(), 'playing');
      assert.equal(env.players.length, 1);
    }
    assert.throws(() => player.setControls({ visibility: 'sometimes' }), /visibility/);
    assert.throws(() => player.setControls({ time: 'yes' }), /boolean/);
    assert.throws(() => player.setControls({ hideDelay: -1 }), /hideDelay/);
    player.destroy();
  } finally { env.close(); }
});

test('standard controls stay visible when paused and controls never trigger surface pause', async () => {
  const env = setup();
  try {
    const player = createPlayer('#one', { ...options, controls: 'standard' });
    await player.ready;
    assert.equal(document.querySelector('#one .csp-toolbar').hidden, false);
    player.play();
    const speed = document.querySelector('#one .csp-speed');
    speed.click(); speed.value = '1.5'; speed.dispatchEvent(new window.Event('change'));
    assert.equal(player.getPlayerState(), 'playing');
    document.querySelector('#one [data-control="playPause"]').click();
    assert.equal(player.getPlayerState(), 'paused');
    assert.equal(document.querySelector('#one .csp-toolbar').hidden, false);
    player.setControls({ showWhenPaused: false });
    assert.equal(document.querySelector('#one .csp-toolbar').hidden, true);
    player.destroy();
  } finally { env.close(); }
});

test('seek clamps to duration, keeps pause intent and drag is not overwritten by timer updates', async () => {
  const env = setup();
  try {
    const player = createPlayer('#one', { ...options, controls: 'standard' });
    await player.ready;
    player.seekTo(-10); assert.equal(player.getCurrentTime(), 0);
    player.seekTo(200); assert.equal(player.getCurrentTime(), 100);
    assert.equal(player.getPlayerState(), 'paused');
    const seek = document.querySelector('#one .csp-seek');
    seek.value = '45'; seek.dispatchEvent(new window.Event('input'));
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(seek.value, '45');
    seek.dispatchEvent(new window.Event('change'));
    assert.equal(player.getCurrentTime(), 45);
    assert.equal(player.getPlayerState(), 'paused');
    player.destroy();
  } finally { env.close(); }
});

test('auto-hide expires, mouse movement reveals, touch keeps controls reachable', async () => {
  const env = setup();
  try {
    const player = createPlayer('#one', { ...options, controls: { visibility: 'auto', hideDelay: 500 } });
    await player.ready; player.play();
    const toolbar = document.querySelector('#one .csp-toolbar');
    await new Promise(resolve => setTimeout(resolve, 550));
    assert.equal(toolbar.hidden, true);
    const root = document.querySelector('#one .csPlayer');
    root.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true }));
    assert.equal(toolbar.hidden, false);
    const touch = new window.Event('pointerdown', { bubbles: true });
    Object.defineProperty(touch, 'pointerType', { value: 'touch' });
    root.dispatchEvent(touch);
    await new Promise(resolve => setTimeout(resolve, 550));
    assert.equal(toolbar.hidden, false);
    player.destroy();
  } finally { env.close(); }
});

test('buffering can be paused; autoplay blocking, ending, looping and errors have explicit states', async () => {
  const env = setup();
  try {
    const states = [];
    const player = createPlayer('#one', { ...options, onStateChange: state => states.push(state) });
    await player.ready; player.play();
    const events = env.players[0].options.events;
    events.onStateChange({ data: 3 });
    document.querySelector('#one .csp-surface').click();
    assert.equal(player.getPlayerState(), 'paused');
    player.play(); events.onAutoplayBlocked();
    assert.equal(player.getPlayerState(), 'paused');
    events.onStateChange({ data: 0 });
    assert.equal(player.getPlayerState(), 'ended');
    assert.equal(document.querySelector('#one .csp-surface').getAttribute('aria-label'), 'Replay video');
    events.onError({ data: 150 });
    assert.equal(player.getPlayerState(), 'error');
    assert.equal(document.querySelector('#one [role="alert"]').hidden, false);
    assert.ok(states.includes('buffering'));
    player.destroy();
    const loop = createPlayer('#one', { ...options, loop: true });
    await loop.ready;
    env.players[1].options.events.onStateChange({ data: 0 });
    assert.equal(loop.getCurrentTime(), 0);
    assert.equal(loop.getPlayerState(), 'playing');
    loop.destroy();
  } finally { env.close(); }
});

test('zero duration disables seek; unsupported fullscreen is hidden', async () => {
  const env = setup();
  try {
    const player = createPlayer('#one', { ...options, controls: 'standard' });
    await player.ready;
    env.players[0].getDuration = () => 0;
    player.setControls('standard');
    assert.equal(document.querySelector('#one .csp-seek').disabled, true);
    assert.equal(document.querySelector('#one [data-control="fullscreen"]').hidden, true);
    player.destroy();
  } finally { env.close(); }
});

test('React controls prop updates retain the existing player', async () => {
  const env = setup();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const root = createRoot(document.querySelector('#one'));
  try {
    await act(async () => { root.render(React.createElement(CSPlayer, { ...options, controls: 'minimal' })); await tick(); });
    const original = env.players[0];
    await act(async () => { root.render(React.createElement(CSPlayer, { ...options, controls: { visibility: 'always', time: false } })); await tick(); });
    assert.equal(env.players.length, 1);
    assert.equal(original.destroyed, undefined);
    assert.equal(document.querySelector('.csp-time').hidden, true);
    assert.equal(document.querySelector('.csp-toolbar').hidden, false);
    await act(async () => root.unmount());
    assert.equal(original.destroyed, true);
  } finally { env.close(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; }
});

test('modern readiness timeout cleans the iframe and permits mounting again', async t => {
  const env = setup({ autoReady: false });
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  try {
    const player = createPlayer('#one', options);
    for (let i = 0; i < 10; i++) await Promise.resolve();
    const rejected = assert.rejects(player.ready, /did not become ready/);
    t.mock.timers.tick(15000);
    await rejected;
    assert.equal(env.players[0].destroyed, true);
    assert.equal(document.querySelector('#one').childNodes.length, 0);
    const retry = createPlayer('#one', options);
    for (let i = 0; i < 10; i++) await Promise.resolve();
    env.players[1].ready();
    await retry.ready; retry.destroy();
  } finally { t.mock.timers.reset(); env.close(); }
});

test('destroy cancels progress and visibility work; late errors do not notify consumers', async t => {
  const env = setup();
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  try {
    let errors = 0;
    const player = createPlayer('#one', { ...options, controls: { visibility: 'auto' }, onError: () => errors++ });
    await player.ready; player.play(); player.destroy();
    env.players[0].getCurrentTime = () => { throw new Error('timer survived destroy'); };
    t.mock.timers.tick(30000);
    env.players[0].options.events.onError({ data: 100 });
    assert.equal(errors, 0);
  } finally { t.mock.timers.reset(); env.close(); }
});

test('pending play survives intermediate cued events so a buffering click still pauses', async () => {
  const env = setup();
  try {
    const player = createPlayer('#one', options);
    await player.ready;
    env.players[0].playVideo = () => {};
    player.play();
    env.players[0].options.events.onStateChange({ data: -1 });
    env.players[0].options.events.onStateChange({ data: 3 });
    const surface = document.querySelector('.csp-surface');
    assert.equal(surface.getAttribute('aria-label'), 'Pause video');
    surface.click();
    assert.equal(player.getPlayerState(), 'paused');
    player.destroy();
  } finally { env.close(); }
});

test('all 64 individual-control combinations retain playback and respect visibility on pause', async () => {
  const env = setup();
  try {
    Object.defineProperty(document, 'fullscreenEnabled', { value: true });
    const player = createPlayer('#one', options);
    await player.ready;
    const keys = ['progress', 'time', 'playPause', 'skip', 'speed', 'fullscreen'];
    for (let mask = 0; mask < 64; mask++) {
      const config = Object.fromEntries(keys.map((key, i) => [key, Boolean(mask & (1 << i))]));
      player.play();
      player.setControls({ ...config, visibility: 'always', showWhenPaused: true });
      assert.equal(player.getPlayerState(), 'playing');
      assert.equal(env.players.length, 1);
      player.pause();
      for (const key of keys) {
        for (const element of document.querySelectorAll(`[data-control="${key}"]`)) assert.equal(element.hidden, !config[key], `${mask}: ${key}`);
      }
      assert.equal(document.querySelector('.csp-toolbar').hidden, mask === 0);
    }
    player.destroy();
  } finally { env.close(); }
});

test('returning from keyboard to mouse input releases the auto-hide focus lock', async t => {
  const env = setup();
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  try {
    const player = createPlayer('#one', { ...options, controls: { visibility: 'auto', hideDelay: 500 } });
    await player.ready; player.play();
    const surface = document.querySelector('.csp-surface');
    surface.focus();
    t.mock.timers.tick(1000);
    assert.equal(document.querySelector('.csp-toolbar').hidden, false);
    surface.dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
    t.mock.timers.tick(1000);
    assert.equal(document.querySelector('.csp-toolbar').hidden, true);
    player.destroy();
  } finally { t.mock.timers.reset(); env.close(); }
});
