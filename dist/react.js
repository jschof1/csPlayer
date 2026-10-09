'use client';
import { createElement, useEffect, useRef, useState } from 'react';
import { createPlayer } from './index.js';

export function CSPlayer({ videoId, thumbnail = true, theme = 'default', loop = false, onReady, onError, onStateChange, controls = 'minimal', ...props }) {
  const host = useRef(null);
  const instance = useRef(null);
  const controlsKey = JSON.stringify(controls);
  const callbacks = useRef({ onReady, onError, onStateChange });
  callbacks.current = { onReady, onError, onStateChange };
  const [error, setError] = useState(null);
  useEffect(() => {
    let active = true;
    let player;
    setError(null);
    const failed = error => {
      if (active) { setError(error.message); callbacks.current.onError?.(error); }
    };
    try {
      player = createPlayer(host.current, { videoId, thumbnail, theme, loop, controls, onError: error => { if (active) callbacks.current.onError?.(error); }, onStateChange: state => callbacks.current.onStateChange?.(state) });
      instance.current = player;
      player.ready.then(() => { if (active) callbacks.current.onReady?.(player); }, failed);
    } catch (error) { failed(error); }
    return () => { active = false; player?.destroy(); instance.current = null; };
  }, [videoId, thumbnail, theme, loop]);
  useEffect(() => {
    try { instance.current?.setControls(JSON.parse(controlsKey)); }
    catch (error) { setError(error.message); callbacks.current.onError?.(error); }
  }, [controlsKey]);
  return createElement('div', props,
    createElement('div', { ref: host }),
    error ? createElement('p', { role: 'alert' }, error) : null);
}
