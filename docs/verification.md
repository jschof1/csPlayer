# Verification — 9 October 2026

Baseline: upstream commit `dfb0a5cb75e9d7c49722575ce8e0de410aac8332`.
The original seven lifecycle tests passed before changes.

## Automated

`npm run check` builds every entry point, runs playback/package regression tests,
and checks a TypeScript consumer importing the public package paths. Coverage:

- Original first playback, pause/resume, keyboard start and concurrent players.
- Delayed API loading, script error/retry, API and iframe readiness timeouts.
- Destruction during loading, late callbacks, repeated destruction and remounting.
- Independent instances, input validation and preservation of occupied hosts.
- Settings reopened repeatedly without stacking handlers.
- YouTube error callback after initialization.
- React Strict Mode, changed props, readiness callbacks and unmount cleanup.
- Server-safe ESM/CommonJS imports and browser global isolation.

## Actual consumer installation

Packed with `npm pack`, then installed the tarball into a separate scratch React +
Vite app under `work/consumer`. That app imports the public React and CSS entries,
has no imports from this repository's source and builds successfully for production.
Vite reports its informational `use client` directive warning; the directive is
intentionally retained for Next.js consumers.

The consuming app was opened in Chromium, loaded a real YouTube embed, and its
play control and unmount/remount flow were exercised. Remount returned to Ready
with one player iframe.

## Real browser checks

The JavaScript playground loaded the YouTube API itself. Clicking its central
Play button produced `playing · 7 / 1344 seconds`; Pause subsequently returned
`paused`. Reviewed desktop and 390px mobile screenshots, including the subset icon
font and unchanged host-page typography. Browser checks also cover the standalone
HTML build and the original demo. These are real network checks, separate from
the mocked regression suite.

The local playground uses Google's public API example video `M7lc1UVf-VE`.
YouTube occasionally logs a transient cross-origin postMessage warning while an
iframe is starting; it did not prevent readiness or playback. No claim is made
about every video, ad flow, browser, CSP configuration or mobile device. Safari,
Firefox and a real Next.js application were not exercised.

## Distribution

The tarball contains the built player, styles, icon subset, type declarations and
documentation. It excludes development dependencies, test fixtures and demos.
The plain HTML zip additionally includes a runnable example. No npm registry
publication or client-site deployment is part of this change.

## 1.0.1 appearance correction

Restored the upstream wide iframe crop, which had been unintentionally replaced
with normal-width rendering during packaging. Pause now hides the custom control
bar/settings and restores only the central play button over the paused frame.
Pointer focus no longer keeps the controls visible; keyboard focus can still
reveal them during playback. Added a pause/resume regression test (18 checks now).
Verified the paused appearance with real YouTube playback in Chromium.

## 1.0.2 single-click pause

Replaced the video-surface click handler that only toggled controller visibility
with immediate pause. Mouse movement reveals the controller; keyboard focus still
reveals it. Settings and transport clicks do not bubble into surface pause.
All 19 regression checks pass. In the in-app browser, a single surface click
changed real YouTube playback from playing to paused at 14 seconds, with only the
central play affordance remaining.

## 1.1.0 configurable interaction layer

The instance API and React component now use `src/player.js`, with one state
renderer, one visibility timer, native control elements and separate video/control
click targets. The old ID-based script remains available and regression-tested.

`npm run check`: 30 tests and TypeScript consumer checks pass. The suite includes
all 64 combinations of the six individual control switches, live configuration
changes without new iframes, React controls updates, paused seeking, drag preview,
zero duration, pointer/keyboard focus transitions, auto-hide timing, touch
visibility, buffering/cued races, autoplay blocking, ended/replay/loop states,
errors, readiness timeouts and cleanup after destruction.

Real in-app Chromium checks: initial playback, one-click surface pause, keyboard
Space play/pause, changing Timer to Full during playback without resetting time,
seeking while paused (44 to 46 seconds), changing playback speed, fullscreen
entry/exit, and automatic visibility. Tested the full layout at measured CSS
viewport widths of 320 and 390 pixels: no horizontal overflow and no overlap
between the central play button and the control bar. Captions are suppressed as
in the original custom player, and YouTube's hidden iframe UI is removed from the
keyboard tab order. The original wide iframe crop is retained.

The tarball was installed into the separate React/Vite consumer and its production
build passed. This is not a claim of testing on physical phones, Safari, Firefox,
or a full Next.js application. Touch visibility is covered by simulated pointer
regression tests; the mobile browser checks above validate layout at narrow widths.

Final installed-package browser check: served the React consumer's production
build on port 8002. Switching controls from timer to minimal and back left exactly
one iframe and one readiness callback, while playback advanced to 12 seconds.
The isolated playground's auto-hide check showed state `playing`, time 14 seconds,
and the toolbar hidden; a single surface click then changed state to `paused` and
showed the bar. Temporary browser test tab closed after verification.
