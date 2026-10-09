import type { HTMLAttributes, ReactElement } from 'react';
import type { Player, PlayerOptions } from './index.js';
export interface CSPlayerProps extends PlayerOptions, Omit<HTMLAttributes<HTMLDivElement>, 'onError' | 'children' | 'dangerouslySetInnerHTML'> {
  onReady?: (player: Player) => void;
  onError?: (error: Error) => void;
}
export declare function CSPlayer(props: CSPlayerProps): ReactElement;
