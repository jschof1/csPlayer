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
