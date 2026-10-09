import { createPlayer, type Player } from '@jschof1/csplayer';
import { CSPlayer } from '@jschof1/csplayer/react';
const player: Player = createPlayer('#player', { videoId: 'M7lc1UVf-VE', theme: 'plyr' });
player.ready.then(p => p.pause());
const component = <CSPlayer videoId="M7lc1UVf-VE" className="video" onReady={p => p.getDuration()} onError={error => console.error(error.message)} />;
void component;
// @ts-expect-error Unknown themes must fail type checking.
createPlayer('#player', { videoId: 'M7lc1UVf-VE', theme: 'missing' });
