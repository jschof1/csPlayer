export interface PlayerOptions {
  videoId: string;
  thumbnail?: boolean | string;
  theme?: 'default' | 'youtube' | 'plyr';
  loop?: boolean;
  /** YouTube errors reported after the player becomes ready. */
  onError?: (error: Error) => void;
}
export interface Player {
  readonly ready: Promise<Player>;
  play(): void;
  pause(): void;
  changeVideo(videoId: string): void;
  getDuration(): number;
  getCurrentTime(): number;
  getVideoTitle(): string;
  getPlayerState(): 'playing' | 'paused' | 'buffering' | 'cued' | 'ended';
  destroy(): void;
}
export declare function createPlayer(target: string | HTMLElement, options: PlayerOptions): Player;
export declare function loadYouTubeAPI(): Promise<void>;
/** Original ID-based API. Load YouTube before calling init. */
export declare const csPlayer: {
  init(id: string, options: Omit<PlayerOptions, 'videoId'> & { defaultId: string }): Promise<void>;
  play(id: string): void;
  pause(id: string): void;
  changeVideo(id: string, videoId: string): void;
  getDuration(id: string): number;
  getCurrentTime(id: string): number;
  getVideoTitle(id: string): string;
  getPlayerState(id: string): ReturnType<Player['getPlayerState']>;
  initialized(id: string): boolean;
  destroy(id: string): void;
};
