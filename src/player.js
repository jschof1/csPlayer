// The reusable player has one renderer and one visibility timer. The legacy
// ID-based engine remains available separately for existing integrations.
const controlDefaults = {
  visibility: 'auto', progress: true, time: true, playPause: true,
  skip: false, speed: true, fullscreen: true, showWhenPaused: true,
  hideDelay: 2500,
};
function normalizeControls(value = 'minimal') {
  if (value === 'minimal') return { ...controlDefaults, visibility: 'hidden' };
  if (value === 'standard') return { ...controlDefaults, visibility: 'always' };
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('controls must be minimal, standard or a controls object.');
  for (const key of Object.keys(value)) {
    if (!Object.hasOwn(controlDefaults, key)) throw new Error(`Unknown control option: ${key}`);
  }
  const result = { ...controlDefaults, ...value };
  if (!['auto', 'always', 'hidden'].includes(result.visibility)) throw new Error('Invalid controls visibility.');
  for (const key of ['progress', 'time', 'playPause', 'skip', 'speed', 'fullscreen', 'showWhenPaused']) {
    if (typeof result[key] !== 'boolean') throw new Error(`${key} must be a boolean.`);
  }
  if (!Number.isFinite(result.hideDelay) || result.hideDelay < 500 || result.hideDelay > 30000) throw new Error('hideDelay must be between 500 and 30000 milliseconds.');
  return result;
}
function playerTime(value) {
  const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  const parts = [Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0'));
  if (seconds >= 3600) parts.unshift(String(Math.floor(seconds / 3600)));
  return parts.join(':');
}
function mountPlayer(node, options) {
  let controls = normalizeControls(options.controls);
  let state = 'loading';
  let yt, destroyed = false, ready = false, started = false, wantsPlay = false;
  let awake = true, touch = false, interacting = false, seeking = false;
  let hideTimer, updateTimer, readyTimer, rejectReady;
  let errorMessage = '';
  node.innerHTML = `
    <div class="csPlayer csPlayer-modern theme-${options.theme}" data-state="loading" role="group" aria-label="Video player">
      <div class="csp-viewport"><div id="${node.id}-iframe"></div></div>
      <button type="button" class="csp-surface" aria-label="Play video" disabled>
        <span class="csp-center" aria-hidden="true"><i class="ti ti-player-play-filled"></i></span>
      </button>
      <div class="csp-toolbar" role="group" aria-label="Video controls" hidden>
        <button type="button" data-control="playPause" aria-label="Play"><i class="ti ti-player-play-filled" aria-hidden="true"></i></button>
        <button type="button" data-control="skip" data-action="back" aria-label="Back 10 seconds"><i class="ti ti-rewind-backward-10" aria-hidden="true"></i></button>
        <button type="button" data-control="skip" data-action="forward" aria-label="Forward 10 seconds"><i class="ti ti-rewind-forward-10" aria-hidden="true"></i></button>
        <span data-control="time" class="csp-time csp-current">00:00</span>
        <input data-control="progress" class="csp-seek" type="range" min="0" max="100" value="0" step="0.1" aria-label="Seek video">
        <span data-control="time" class="csp-time csp-duration">00:00</span>
        <select data-control="speed" class="csp-speed" aria-label="Playback speed">
          <option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="1.75">1.75×</option><option value="2">2×</option>
        </select>
        <button type="button" data-control="fullscreen" aria-label="Enter fullscreen"><i class="ti ti-maximize" aria-hidden="true"></i></button>
      </div>
      <p class="csp-error" role="alert" hidden></p>
    </div>`;
  const root = node.firstElementChild;
  const surface = root.querySelector('.csp-surface');
  const center = root.querySelector('.csp-center');
  const toolbar = root.querySelector('.csp-toolbar');
  const seek = root.querySelector('.csp-seek');
  const speed = root.querySelector('.csp-speed');
  const alert = root.querySelector('.csp-error');
  const cleanups = [];
  const listen = (target, name, handler) => {
    target.addEventListener(name, handler);
    cleanups.push(() => target.removeEventListener(name, handler));
  };
  if (options.thumbnail) {
    const url = options.thumbnail === true ? `https://img.youtube.com/vi/${options.videoId}/maxresdefault.jpg` : options.thumbnail;
    surface.style.backgroundImage = `url(${JSON.stringify(url)})`;
  }
  function assertReady() {
    if (destroyed) throw new Error('Player has been destroyed.');
    if (!ready) throw new Error('Await player.ready before using playback methods.');
  }
  function render() {
    if (destroyed) return;
    root.dataset.state = state;
    root.setAttribute('aria-busy', String(state === 'loading' || state === 'buffering'));
    surface.disabled = !ready;
    surface.setAttribute('aria-label', wantsPlay ? 'Pause video' : (state === 'ended' ? 'Replay video' : 'Play video'));
    center.hidden = state === 'playing';
    center.classList.toggle('csp-busy', state === 'loading' || state === 'buffering');
    if (started) surface.style.backgroundImage = 'none';
    alert.hidden = !errorMessage;
    alert.textContent = errorMessage;
    const paused = ['paused', 'cued', 'ended', 'error'].includes(state);
    let count = 0;
    for (const element of toolbar.querySelectorAll('[data-control]')) {
      const key = element.dataset.control;
      const enabled = controls[key] && (key !== 'fullscreen' || !!document.fullscreenEnabled);
      element.hidden = !enabled;
      if (enabled) count++;
      if (!enabled && element === document.activeElement) surface.focus();
    }
    const visible = ready && count > 0 && controls.visibility !== 'hidden' &&
      (paused ? controls.showWhenPaused : controls.visibility === 'always' || touch || awake || interacting || seeking);
    // Move keyboard focus to the surface before hiding a focused control.
    if (!visible && toolbar.contains(document.activeElement)) surface.focus();
    toolbar.hidden = !visible;
    reserveControlsSpace();
    const playButton = toolbar.querySelector('[data-control="playPause"]');
    playButton.setAttribute('aria-label', wantsPlay ? 'Pause' : 'Play');
    playButton.firstElementChild.className = `ti ${wantsPlay ? 'ti-player-pause-filled' : 'ti-player-play-filled'}`;
    seek.disabled = !(yt?.getDuration?.() > 0);
  }
  function reserveControlsSpace() {
    root.style.setProperty('--csp-toolbar-space', `${toolbar.hidden ? 0 : toolbar.offsetHeight + 8}px`);
  }
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(reserveControlsSpace);
    observer.observe(toolbar);
    cleanups.push(() => observer.disconnect());
  }
  function scheduleHide() {
    clearTimeout(hideTimer);
    if (controls.visibility !== 'auto' || touch || interacting || seeking || state !== 'playing') return;
    hideTimer = setTimeout(() => { awake = false; render(); }, controls.hideDelay);
  }
  function reveal() { awake = true; render(); scheduleHide(); }
  function notifyState() { options.onStateChange?.(state); }
  function setState(next) {
    const changed = next !== state;
    state = next;
    if (next === 'playing') wantsPlay = true;
    else if (['paused', 'ended', 'error'].includes(next)) wantsPlay = false;
    if (next === 'playing') {
      started = true; errorMessage = '';
      try { yt.unloadModule?.('captions'); } catch {}
    }
    if (next !== 'playing') clearTimeout(hideTimer);
    render(); updateProgress(); scheduleHide(); if (changed) notifyState();
  }
  function fail(error) {
    if (destroyed) return;
    errorMessage = error.message;
    if (!ready) { rejectReady(error); return; }
    setState('error'); options.onError?.(error);
  }
  function updateProgress() {
    if (destroyed || !ready) return;
    const duration = Math.max(0, yt.getDuration() || 0);
    const time = Math.max(0, yt.getCurrentTime() || 0);
    root.querySelector('.csp-current').textContent = playerTime(seeking ? Number(seek.value) * duration / 100 : time);
    root.querySelector('.csp-duration').textContent = playerTime(duration);
    if (!seeking) seek.value = duration > 0 ? Math.min(100, time / duration * 100) : 0;
    seek.setAttribute('aria-valuetext', `${playerTime(seeking ? Number(seek.value) * duration / 100 : time)} of ${playerTime(duration)}`);
    seek.disabled = !duration;
  }
  function play() { assertReady(); wantsPlay = true; errorMessage = ''; setState('buffering'); yt.unMute(); yt.playVideo(); }
  function pause() { assertReady(); wantsPlay = false; yt.pauseVideo(); render(); }
  function toggle() { wantsPlay ? pause() : play(); }
  function seekTo(seconds) {
    assertReady();
    const duration = yt.getDuration();
    if (!Number.isFinite(seconds) || !duration) return;
    const resume = wantsPlay;
    yt.seekTo(Math.max(0, Math.min(duration, seconds)), true);
    // YouTube can start playback when seeking a cued video. Preserve intent.
    if (!resume) yt.pauseVideo();
    updateProgress();
  }
  listen(surface, 'click', toggle);
  listen(toolbar.querySelector('[data-control="playPause"]'), 'click', toggle);
  listen(toolbar.querySelector('[data-action="back"]'), 'click', () => seekTo(yt.getCurrentTime() - 10));
  listen(toolbar.querySelector('[data-action="forward"]'), 'click', () => seekTo(yt.getCurrentTime() + 10));
  listen(root, 'pointermove', event => {
    if (event.pointerType !== 'touch') reveal();
  });
  listen(root, 'pointerdown', event => {
    interacting = event.target.matches('select, input');
    if (event.pointerType === 'touch') touch = true;
    reveal();
  });
  listen(root, 'focusin', event => {
    if (event.target.matches(':focus-visible')) { interacting = true; reveal(); }
  });
  listen(root, 'focusout', () => {
    queueMicrotask(() => {
      if (destroyed) return;
      interacting = root.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
      scheduleHide();
    });
  });
  listen(seek, 'input', () => { seeking = true; clearTimeout(hideTimer); updateProgress(); });
  listen(seek, 'change', () => {
    seekTo(Number(seek.value) * yt.getDuration() / 100);
    seeking = false; updateProgress(); scheduleHide();
  });
  listen(seek, 'blur', () => { seeking = false; updateProgress(); scheduleHide(); });
  listen(speed, 'change', () => { yt.setPlaybackRate(Number(speed.value)); reveal(); });
  listen(toolbar, 'keydown', event => {
    if (event.key === 'Escape') { surface.focus(); interacting = false; awake = false; render(); }
  });
  const fullscreenButton = toolbar.querySelector('[data-control="fullscreen"]');
  listen(fullscreenButton, 'click', async () => {
    try {
      if (document.fullscreenElement === root) await document.exitFullscreen();
      else await root.requestFullscreen();
    } catch (error) { options.onError?.(error); }
  });
  listen(document, 'fullscreenchange', () => {
    fullscreenButton.setAttribute('aria-label', document.fullscreenElement === root ? 'Exit fullscreen' : 'Enter fullscreen');
    reveal();
  });
  const api = {
    ready: null, play, pause, seekTo,
    setControls(value) {
      if (destroyed) throw new Error('Player has been destroyed.');
      controls = normalizeControls(value);
      if (!controls.progress || controls.visibility === 'hidden') seeking = false;
      reveal();
    },
    changeVideo(id) {
      assertReady();
      if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('Invalid YouTube video ID.');
      wantsPlay = true; started = true; errorMessage = '';
      setState('buffering'); yt.loadVideoById(id, 0);
    },
    getDuration() { assertReady(); return yt.getDuration(); },
    getCurrentTime() { assertReady(); return yt.getCurrentTime(); },
    getVideoTitle() { assertReady(); return yt.getVideoData().title; },
    getPlayerState() { assertReady(); return state; },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearTimeout(readyTimer); clearTimeout(hideTimer); clearInterval(updateTimer);
      cleanups.forEach(cleanup => cleanup());
      rejectReady?.(new Error('Player destroyed before readiness.'));
      yt?.destroy(); root.remove();
    },
  };
  api.ready = new Promise((resolve, reject) => {
    rejectReady = reject;
    readyTimer = setTimeout(() => reject(new Error('YouTube player did not become ready within 15 seconds.')), 15000);
    yt = new window.YT.Player(`${node.id}-iframe`, {
      videoId: options.videoId,
      playerVars: { controls: 0, autoplay: 0, playsinline: 1, disablekb: 1, fs: 0, rel: 0, origin: window.location.origin },
      events: {
        onReady() {
          if (destroyed) return;
          clearTimeout(readyTimer);
          ready = true;
          const iframe = root.querySelector('iframe');
          iframe?.setAttribute('tabindex', '-1');
          iframe?.setAttribute('aria-hidden', 'true');
          root.setAttribute('aria-label', yt.getVideoData?.().title || 'Video player');
          setState('cued');
          updateTimer = setInterval(updateProgress, 250);
          resolve(api);
        },
        onStateChange(event) {
          if (destroyed || !ready) return;
          const next = { '-1': 'cued', 0: 'ended', 1: 'playing', 2: 'paused', 3: 'buffering', 5: 'cued' }[event.data];
          if (!next) return;
          if (next === 'ended' && options.loop) { yt.seekTo(0, true); play(); return; }
          setState(next === 'cued' && wantsPlay ? 'buffering' : next);
        },
        onPlaybackRateChange(event) { if (!destroyed) speed.value = String(event.data); },
        onAutoplayBlocked() { if (!destroyed && ready) setState('paused'); },
        onError(event) { fail(new Error(`YouTube player error: ${event.data}`)); },
      },
    });
  });
  api.ready.catch(() => {});
  render();
  return api;
}
