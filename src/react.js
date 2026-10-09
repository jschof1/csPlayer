'use client';
import { createElement, useEffect, useRef, useState } from 'react';
import { createPlayer } from './index.js';

export function CSPlayer({ videoId, thumbnail = true, theme = 'default', loop = false, onReady, onError, ...props }) {
  const host = useRef(null);
  const callbacks = useRef({ onReady, onError });
  callbacks.current = { onReady, onError };
  const [error, setError] = useState(null);
  useEffect(() => {
    let active = true;
    let player;
    setError(null);
    const failed = error => {
      if (active) { setError(error.message); callbacks.current.onError?.(error); }
    };
    try {
      player = createPlayer(host.current, { videoId, thumbnail, theme, loop, onError: failed });
      player.ready.then(() => { if (active) callbacks.current.onReady?.(player); }, failed);
    } catch (error) { failed(error); }
    return () => { active = false; player?.destroy(); };
  }, [videoId, thumbnail, theme, loop]);
  return createElement('div', props,
    createElement('div', { ref: host }),
    error ? createElement('p', { role: 'alert' }, error) : null);
}
