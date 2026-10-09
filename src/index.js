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
  const { videoId, thumbnail = true, theme = 'default', loop = false, onError } = options;
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || '')) throw new Error('videoId must be an 11-character YouTube video ID.');
  if (!['default', 'youtube', 'plyr'].includes(theme)) throw new Error('Unknown csPlayer theme.');
  if (typeof thumbnail !== 'boolean' && typeof thumbnail !== 'string') throw new Error('thumbnail must be a boolean or URL.');
  if (onError !== undefined && typeof onError !== 'function') throw new Error('onError must be a function.');
  if (typeof loop !== 'boolean') throw new Error('loop must be a boolean.');
  const node = document.createElement('div');
  do { node.id = `csplayer-mount-${++nextId}`; } while (document.getElementById(node.id));
  host.append(node);
  let destroyed = false;
  let rejectCancelled;
  const cancelled = new Promise((_, reject) => { rejectCancelled = reject; });
  const assertReady = () => {
    if (destroyed) throw new Error('Player has been destroyed.');
    if (!csPlayer.csPlayers[node.id]?.initialized) throw new Error('Await player.ready before using playback methods.');
  };
  const player = {
    ready: null,
    play() { assertReady(); csPlayer.play(node.id); },
    pause() { assertReady(); csPlayer.pause(node.id); },
    changeVideo(id) {
      assertReady();
      if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('Invalid YouTube video ID.');
      csPlayer.changeVideo(node.id, id);
    },
    getDuration() { assertReady(); return csPlayer.getDuration(node.id); },
    getCurrentTime() { assertReady(); return csPlayer.getCurrentTime(node.id); },
    getVideoTitle() { assertReady(); return csPlayer.getVideoTitle(node.id); },
    getPlayerState() { assertReady(); return csPlayer.getPlayerState(node.id); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      rejectCancelled(new Error('Player destroyed before readiness.'));
      if (csPlayer.csPlayers[node.id]) csPlayer.destroy(node.id);
      node.remove();
      mounts.delete(host);
    },
  };
  mounts.set(host, player);
  player.ready = Promise.race([
    loadYouTubeAPI().then(() => {
      if (destroyed) throw new Error('Player destroyed before readiness.');
      return csPlayer.init(node.id, { defaultId: videoId, thumbnail, theme, loop, onError });
    }),
    cancelled,
  ]).then(() => player).catch(error => { player.destroy(); throw error; });
  // A framework can unmount before it attaches a readiness handler.
  player.ready.catch(() => {});
  return player;
}
