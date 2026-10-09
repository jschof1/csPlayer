// No DOM work at import time: safe to import from server-rendered applications.
let youtubePromise;
function loadYouTubeAPI() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('csPlayer requires a browser to mount.'));
  }
  if (typeof window.YT?.Player === 'function') return Promise.resolve();
  if (youtubePromise) return youtubePromise;
  youtubePromise = new Promise((resolve, reject) => {
    let script = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    const owned = !script;
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
    }
    let poll;
    const cleanup = () => { clearInterval(poll); clearTimeout(timeout); script.removeEventListener('error', failed); };
    const failed = () => {
      cleanup();
      if (owned) script.remove();
      reject(new Error('Could not load the YouTube iframe API. Check your connection and content security policy.'));
    };
    const timeout = setTimeout(failed, 15000);
    script.addEventListener('error', failed, { once: true });
    poll = setInterval(() => {
      if (typeof window.YT?.Player === 'function') { cleanup(); resolve(); }
    }, 50);
    if (owned) document.head.append(script);
  }).catch(error => { youtubePromise = undefined; throw error; });
  return youtubePromise;
}

const mounts = new WeakMap();
let nextId = 0;
/** Mount into an empty element. Destroy is safe even while ready is pending. */
function createPlayer(target, options = {}) {
  if (typeof document === 'undefined') throw new Error('csPlayer requires a browser to mount.');
  const host = typeof target === 'string' ? document.querySelector(target) : target;
  if (!host || host.nodeType !== 1 || !host.isConnected) throw new Error('Player target must be a connected HTML element.');
  if (mounts.has(host) || host.childNodes.length) throw new Error('Player target must be empty and not already mounted.');
  const { videoId, thumbnail = true, theme = 'default', loop = false, onError, onStateChange } = options;
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || '')) throw new Error('videoId must be an 11-character YouTube video ID.');
  if (!['default', 'youtube', 'plyr'].includes(theme)) throw new Error('Unknown csPlayer theme.');
  if (typeof thumbnail !== 'boolean' && typeof thumbnail !== 'string') throw new Error('thumbnail must be a boolean or URL.');
  if (onError !== undefined && typeof onError !== 'function') throw new Error('onError must be a function.');
  if (typeof loop !== 'boolean') throw new Error('loop must be a boolean.');
  normalizeControls(options.controls);
  if (onStateChange !== undefined && typeof onStateChange !== 'function') throw new Error('onStateChange must be a function.');
  const node = document.createElement('div');
  do { node.id = `csplayer-mount-${++nextId}`; } while (document.getElementById(node.id));
  host.append(node);
  let destroyed = false;
  let engine;
  let controlOptions = options.controls;
  let rejectCancelled;
  const cancelled = new Promise((_, reject) => { rejectCancelled = reject; });
  let readyDone = false;
  const assertReady = () => {
    if (destroyed) throw new Error('Player has been destroyed.');
    if (!engine || !readyDone) throw new Error('Await player.ready before using playback methods.');
  };
  const player = {
    ready: null,
    play() { assertReady(); engine.play(); },
    pause() { assertReady(); engine.pause(); },
    changeVideo(id) {
      assertReady();
      if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('Invalid YouTube video ID.');
      engine.changeVideo(id);
    },
    getDuration() { assertReady(); return engine.getDuration(); },
    getCurrentTime() { assertReady(); return engine.getCurrentTime(); },
    getVideoTitle() { assertReady(); return engine.getVideoTitle(); },
    getPlayerState() { assertReady(); return engine.getPlayerState(); },
    seekTo(seconds) { assertReady(); engine.seekTo(seconds); },
    setControls(value) {
      if (destroyed) throw new Error('Player has been destroyed.');
      normalizeControls(value);
      controlOptions = value;
      engine?.setControls(value);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      rejectCancelled(new Error('Player destroyed before readiness.'));
      engine?.destroy();
      node.remove();
      mounts.delete(host);
    },
  };
  mounts.set(host, player);
  player.ready = Promise.race([
    loadYouTubeAPI().then(() => {
      if (destroyed) throw new Error('Player destroyed before readiness.');
      engine = mountPlayer(node, { videoId, thumbnail, theme, loop, onError, onStateChange, controls: controlOptions });
      return engine.ready;
    }),
    cancelled,
  ]).then(() => { readyDone = true; return player; }).catch(error => { player.destroy(); throw error; });
  // A framework can unmount before it attaches a readiness handler.
  player.ready.catch(() => {});
  return player;
}
