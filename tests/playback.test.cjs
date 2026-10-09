const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(process.env.CSPLAYER_SOURCE || require.resolve('../src/csPlayer.js'), 'utf8');

// Model the YouTube lifecycle independently: iframe load precedes API onReady.
// No network, video availability, browser autoplay policy, or npm dependencies.
function setup({ delayedApi = false, fail = false } = {}) {
  const players = [];
  const containers = new Map();
  let now = 0;
  const timers = new Map();
  let timerId = 0;
  function element(parent) {
    const listeners = new Map();
    const classes = new Set(['csPlayer-loading']);
    return {
      style: {}, attributes: {}, value: 0, innerHTML: '',
      classList: {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
        contains: (name) => classes.has(name),
      },
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(name, handler) {
        listeners.set(name, [...(listeners.get(name) || []), handler]);
      },
      dispatch(name, event = {}) {
        for (const handler of listeners.get(name) || []) handler(event);
      },
      closest: () => parent,
      contains: () => false,
      remove() {},
    };
  }
  function container(id) {
    const nodes = new Map();
    const root = element();
    root.closest = () => root;
    root.querySelector = (selector) => {
      if (!nodes.has(selector)) nodes.set(selector, element(root));
      return nodes.get(selector);
    };
    containers.set(id, root);
    return root;
  }
  const yt = {
    PlayerState: { PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5, ENDED: 0 },
    Player: function(id, options) {
      this.id = id;
      this.options = options;
      this.muted = true;
      this.playCalls = 0;
      this.time = 20;
      this.unMute = () => { this.muted = false; };
      this.isMuted = () => this.muted;
      this.playVideo = () => {
        this.playCalls++;
        options.events.onStateChange?.({ data: yt.PlayerState.PLAYING });
      };
      this.pauseVideo = () => options.events.onStateChange?.({ data: yt.PlayerState.PAUSED });
      this.addEventListener = (name, handler) => { options.events[name] = handler; };
      this.getCurrentTime = () => this.time;
      this.getDuration = () => 100;
      this.getVideoLoadedFraction = () => 0.5;
      this.seekTo = (time) => { this.time = time; };
      this.unloadModule = () => {};
      this.destroy = () => { this.destroyed = true; };
      players.push(this);
      const root = containers.get(id.replace('csPlayer-', ''));
      root.querySelector('.csPlayer-container iframe').dispatch('load');
    },
  };
  const context = vm.createContext({
    console: { log() {} },
    window: { location: { origin: 'https://player.example' } },
    document: {
      fullscreenEnabled: false,
      querySelector(selector) {
        return containers.get(selector.replace(/^#(?:csPlayer-)?/, ''));
      },
      querySelectorAll(selector) {
        const node = this.querySelector(selector);
        return node ? [node] : [];
      },
    },
    Date: { now: () => now },
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout: (id) => timers.delete(id),
    setInterval: () => ++timerId,
    clearInterval() {},
  });
  if (!delayedApi) context.YT = yt;
  vm.runInContext(source, context);
  async function flush() { for (let i = 0; i < 20; i++) await Promise.resolve(); }
  async function init(id = 'video') {
    const root = container(id);
    const promise = context.csPlayer.init(id, { defaultId: 'M7lc1UVf-VE', thumbnail: true });
    await flush();
    return { root, promise };
  }
  function ready(player = players.at(-1)) {
    if (fail) player.options.events.onError({ data: 100 });
    else player.options.events.onReady({ target: player });
  }
  function tick() {
    const entry = [...timers].find(([, timer]) => timer.delay === 50);
    assert.ok(entry, 'API readiness poll should be scheduled');
    timers.delete(entry[0]);
    now += 50;
    entry[1].callback();
  }
  return { context, players, init, ready, flush, tick, expireReady: () => {
    const entry = [...timers].find(([, timer]) => timer.delay === 15000);
    assert.ok(entry);
    timers.delete(entry[0]);
    entry[1].callback();
  }, loadApi: () => { context.YT = yt; } };
}

test('init remains pending until YouTube reports readiness', async () => {
  const env = setup();
  const { promise } = await env.init();
  let resolved = false;
  promise.then(() => { resolved = true; });
  await env.flush();
  assert.equal(resolved, false);
  assert.equal(env.context.csPlayer.initialized('video'), false);
  env.ready();
  await promise;
  assert.equal(env.context.csPlayer.initialized('video'), true);
  assert.equal(env.players[0].playCalls, 0, 'initialization must not autoplay');
});

test('central Play works when iframe load fired before onReady', async () => {
  const env = setup();
  const { root, promise } = await env.init();
  env.ready();
  await promise;
  const start = root.querySelector('.csPlayer-container span i');
  assert.equal(start.classList.contains('csPlayer-loading'), false);
  start.dispatch('click');
  assert.equal(env.players[0].playCalls, 1);
  assert.equal(env.players[0].muted, false);
  assert.equal(env.context.csPlayer.getPlayerState('video'), 'playing');
  assert.equal(root.querySelector('.csPlayer-container span').style.display, 'none');
  root.querySelector('.csPlayer-controls-box main i:nth-of-type(2)').dispatch('click');
  assert.equal(env.context.csPlayer.getPlayerState('video'), 'paused');
  root.querySelector('.csPlayer-controls-box main i:nth-of-type(2)').dispatch('click');
  assert.equal(env.players[0].playCalls, 2);
});

test('public play can start a fresh muted player', async () => {
  const env = setup();
  const { promise } = await env.init();
  env.ready();
  await promise;
  env.context.csPlayer.play('video');
  assert.equal(env.players[0].playCalls, 1);
  assert.equal(env.players[0].muted, false);
});

test('Enter and Space activate Play', async () => {
  const env = setup();
  const { root, promise } = await env.init();
  env.ready();
  await promise;
  let prevented = 0;
  for (const key of ['Enter', ' ']) {
    root.querySelector('.csPlayer-container span i').dispatch('keydown', {
      key, preventDefault() { prevented++; },
    });
  }
  assert.equal(env.players[0].playCalls, 2);
  assert.equal(prevented, 2);
});

test('slow API loading and concurrent players preserve their own target', async () => {
  const env = setup({ delayedApi: true });
  const first = await env.init('first');
  const second = await env.init('second');
  assert.equal(env.players.length, 0);
  env.loadApi();
  env.tick();
  env.tick();
  await env.flush();
  assert.deepEqual(env.players.map((p) => p.id), ['csPlayer-first', 'csPlayer-second']);
  env.players.forEach(env.ready);
  await Promise.all([first.promise, second.promise]);
  first.root.querySelector('.csPlayer-container span i').dispatch('click');
  assert.deepEqual(env.players.map((p) => p.playCalls), [1, 0]);
});

test('API load timeout rejects and releases the player for retry', async () => {
  const env = setup({ delayedApi: true });
  const { promise } = await env.init();
  const rejection = assert.rejects(promise, /YouTube iframe API did not load/);
  for (let i = 0; i < 300; i++) env.tick();
  await rejection;
  assert.equal('video' in env.context.csPlayer.csPlayers, false);
  env.loadApi();
  const retry = await env.init();
  env.ready();
  await retry.promise;
});

test('YouTube initialization errors reach init catch handlers', async () => {
  const env = setup({ fail: true });
  const { promise } = await env.init();
  env.ready();
  await assert.rejects(promise, /YouTube player error: 100/);
  assert.equal('video' in env.context.csPlayer.csPlayers, false);
});


test('iframe readiness timeout destroys its player and permits retry', async () => {
  const env = setup();
  const { promise } = await env.init();
  const rejected = assert.rejects(promise, /did not become ready/);
  env.expireReady();
  await rejected;
  assert.equal(env.players[0].destroyed, true);
  assert.equal('video' in env.context.csPlayer.csPlayers, false);
  const retry = await env.init();
  env.ready();
  await retry.promise;
});
