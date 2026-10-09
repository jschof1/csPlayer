import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
// Keep the original script-tag API while isolating its names inside each bundle.
await rm('dist', { recursive: true, force: true });
await mkdir('dist/icons', { recursive: true });
const core = await readFile('src/csPlayer.js', 'utf8');
const api = await readFile('src/index.js', 'utf8');
const exports = 'export { createPlayer, loadYouTubeAPI, csPlayer };';
await writeFile('dist/index.js', `${core}\n${api}\n${exports}\n`);
await writeFile('dist/index.cjs', `'use strict';\n${core}\n${api}\nmodule.exports = { createPlayer, loadYouTubeAPI, csPlayer };\n`);
await writeFile('dist/csPlayer.browser.js', `(function () {\n'use strict';\n${core}\n${api}\nwindow.CSPlayer = { createPlayer, loadYouTubeAPI, csPlayer };\n})();\n`);
await copyFile('src/react.js', 'dist/react.js');
await copyFile('src/csPlayer.css', 'dist/csPlayer.css');
for (const file of ['index.d.ts', 'react.d.ts']) await copyFile(`types/${file}`, `dist/${file}`);
for (const file of ['csplayer-icons.css', 'csplayer-icons.woff2']) {
  await copyFile(`src/icons/${file}`, `dist/icons/${file}`);
}
console.log('Built JavaScript, CommonJS, browser and React entry points with styles and types.');
