# csPlayer

A reusable YouTube player for **JavaScript, React and plain HTML**. The original
player is now packaged with scoped styles, TypeScript definitions, automatic
YouTube API loading and safe cleanup. No runtime dependencies for the JavaScript
or HTML versions. React is an optional peer dependency.

## Use in another project

Create an installable file from this checkout:

```sh
cd /Users/jack/Documents/GitHub/csPlayer
npm pack
```

Then, from your other project's directory:

```sh
npm install /Users/jack/Documents/GitHub/csPlayer/jschof1-csplayer-1.0.2.tgz
```

This installs **only the built package**, not the repository, demos or development
tools. Keep the tarball in the consuming project's `vendor/` directory and install
`./vendor/jschof1-csplayer-1.0.2.tgz` if teammates or CI need to reproduce the install.
The package is not published on the npm registry.

### React / Next.js / Vite

```jsx
import { CSPlayer } from '@jschof1/csplayer/react';
import '@jschof1/csplayer/style.css';

export default function Video() {
  return (
    <CSPlayer
      videoId="M7lc1UVf-VE"
      theme="plyr"
      onReady={player => console.log('Ready', player.getDuration())}
      onError={error => console.error(error)}
    />
  );
}
```

The component cleans up on unmount, including React Strict Mode. Changing video,
theme, thumbnail or loop remounts the player and resets playback. Callback changes
do not remount it. `className`, `style`, `id` and other div attributes apply to its
outer wrapper. Initialization and later YouTube errors display an inline alert and
call `onError`. Do not supply children or `dangerouslySetInnerHTML`.

The React entry includes `'use client'`. In Next.js, import the stylesheet from your
app layout; use a client component when passing callback props. Importing the
JavaScript API on a server is safe, but mounting requires a browser.

### JavaScript / Vue / Svelte / other frameworks

```js
import { createPlayer } from '@jschof1/csplayer';
import '@jschof1/csplayer/style.css';

const player = createPlayer('#player', {
  videoId: 'M7lc1UVf-VE',
  thumbnail: true,
  theme: 'default',
  loop: false,
  onError: error => console.error(error), // playback errors after readiness
});

try {
  await player.ready;
  // Call player.play() from a user click, not automatically here.
} catch (error) {
  console.error(error); // load failure, unavailable embed or cancelled mount
}

// On route change or framework unmount:
player.destroy();
```

The target is a CSS selector or connected, empty HTMLElement, e.g.
`<div id="player"></div>`. Each call returns an independent player. Mount from your
framework's mounted/effect hook and call `destroy()` from its cleanup hook.

| Option | Default | Meaning |
| --- | --- | --- |
| `videoId` | required | 11-character YouTube video ID, not a full URL |
| `thumbnail` | `true` | YouTube thumbnail, `false`, or custom image URL |
| `theme` | `'default'` | `'default'`, `'youtube'` or `'plyr'` |
| `loop` | `false` | Repeat when playback ends |
| `onError` | none | Callback for YouTube errors after readiness |

`player.ready` resolves to the player. After readiness, use `play()`, `pause()`,
`changeVideo(videoId)`, `getDuration()`, `getCurrentTime()`, `getVideoTitle()` and
`getPlayerState()`. Times are seconds. `changeVideo()` loads and starts the new
video; invoke it from a user action. `destroy()` works before readiness and is
safe to call more than once. Destroying a pending mount rejects `ready`.

### Plain HTML, without build tools

Copy **the contents of `dist/`** into your project's `vendor/csplayer/` directory,
including its `icons/` subfolder. Keep `THIRD-PARTY-NOTICES.md` with those files.

```html
<link rel="stylesheet" href="/vendor/csplayer/csPlayer.css">
<div id="player"></div>
<script src="/vendor/csplayer/csPlayer.browser.js"></script>
<script>
  const player = CSPlayer.createPlayer('#player', { videoId: 'M7lc1UVf-VE' });
  player.ready.catch(console.error);
</script>
```

Serve the page over HTTP(S), not `file://`. No separate YouTube script is needed.
The bundle exposes only `window.CSPlayer`; it does not overwrite `$` or an existing
`onYouTubeIframeAPIReady` callback. For an even smaller copy, only the browser JS,
CSS and `icons/` are required.

## Try it locally

```sh
npm ci
npm run check
npm run dev
```

Open **http://127.0.0.1:8000**. Try Play, Pause, playback status, all three themes,
and Remove player → Mount player. The plain HTML example uses the standalone
bundle; the original demo still uses the legacy source files.

## Styling

Styles and icon classes are scoped to `.csPlayer`; they do not reset the host
page. The original themes and wide iframe crop are retained, keeping YouTube chrome
outside the visible player. Pausing hides the control bar and shows only the
central play button over the paused frame. A single click on the playing video
pauses immediately; mouse movement or keyboard focus reveals the controls.
Override the CSS variables on your player:

```css
.my-video .csPlayer {
  --playerBR: 12px;
  --startBtnBg: #ffcc00;
  --startBtnIconColor: #111;
  --sliderSeekTrackColor: #ffcc00;
}
```

See `src/csPlayer.css` for all variables. Use a container large enough for YouTube's
[minimum embed dimensions](https://developers.google.com/youtube/iframe_api_reference#Requirements).

## Behaviour and limits

- Initialization does not autoplay. Browser autoplay rules still apply.
- Mounting loads YouTube and may request a YouTube thumbnail immediately. If your
  site gates third-party media on consent, mount only after that consent.
- API loading and iframe readiness each have a 15-second timeout. Failed mounts
  release their target for retry. A shared API load can finish after the last
  player unmounts; it cannot recreate a destroyed player.
- YouTube handles video availability, ads, restrictions and playback quality.
  The old quality selector was removed because the iframe API no longer supports
  quality selection. See the [official API revision history](https://developers.google.com/youtube/iframe_api_reference#Revision_History).
- YouTube scripts, frames, media and thumbnails need to be allowed by your site's
  content security policy. Real playback requires a network connection.
- The original repository has no explicit license. Packaging does not change its
  licensing; npm publication is disabled. Icon attribution is included in
  `THIRD-PARTY-NOTICES.md`.

## Maintaining the package

- `src/csPlayer.js`: original ID-based playback engine, with lifecycle fixes.
- `src/index.js`: reusable instance API and shared YouTube loader.
- `src/react.js`: optional React lifecycle adapter.
- `src/csPlayer.css`, `src/icons/csplayer-icons.*`: scoped styles and seven-icon font.
- `types/`: public TypeScript contracts.
- `scripts/build.mjs`: dependency-free generation of ESM, CommonJS and browser builds.
- `tests/`: playback, lifecycle, packaging and React regression tests.

Use Node.js 22.13+ for development dependencies. Run `npm run check` and `npm pack`
after changes. Commit regenerated `dist/` so consumers can copy files without a
build. The font subset is checked in; normal builds do not require Python.

The [legacy API reference](docs/legacy-api.md) documents `csPlayer.init(id, options)`
for existing users. New projects should use `createPlayer()` or `<CSPlayer />`.
