import { createPlayer, type Player } from '@jschof1/csplayer';
import { CSPlayer } from '@jschof1/csplayer/react';
const player: Player = createPlayer('#player', { videoId: 'M7lc1UVf-VE', theme: 'plyr' });
player.ready.then(p => p.pause());
const component = <CSPlayer videoId="M7lc1UVf-VE" className="video" onReady={p => p.getDuration()} onError={error => console.error(error.message)} />;
void component;
// @ts-expect-error Unknown themes must fail type checking.
createPlayer('#player', { videoId: 'M7lc1UVf-VE', theme: 'missing' });
player.setControls({ visibility: 'always', progress: true, time: true, skip: false });
player.seekTo(15);
const custom = <CSPlayer videoId="M7lc1UVf-VE" controls={{ visibility: 'auto', showWhenPaused: false }} onStateChange={state => console.log(state)} />;
void custom;
// @ts-expect-error Invalid control visibility must be rejected.
player.setControls({ visibility: 'hover' });
