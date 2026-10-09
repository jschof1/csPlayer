export type PlayerState = 'cued' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error';
export interface ControlsOptions {
  visibility?: 'always' | 'auto' | 'hidden';
  progress?: boolean;
  time?: boolean;
  playPause?: boolean;
  skip?: boolean;
  speed?: boolean;
  fullscreen?: boolean;
  showWhenPaused?: boolean;
  /** Auto-hide delay, 500–30000 ms. Default 2500. Touch keeps controls visible. */
  hideDelay?: number;
}
export type PlayerControls = 'minimal' | 'standard' | ControlsOptions;
export interface PlayerOptions {
  videoId: string;
  thumbnail?: boolean | string;
  theme?: 'default' | 'youtube' | 'plyr';
  loop?: boolean;
  controls?: PlayerControls;
  onStateChange?: (state: PlayerState) => void;
  /** YouTube errors reported after the player becomes ready. */
  onError?: (error: Error) => void;
}
export interface Player {
  readonly ready: Promise<Player>;
  play(): void;
  pause(): void;
  changeVideo(videoId: string): void;
  seekTo(seconds: number): void;
  setControls(controls: PlayerControls): void;
  getDuration(): number;
  getCurrentTime(): number;
  getVideoTitle(): string;
  getPlayerState(): PlayerState;
  destroy(): void;
}
export declare function createPlayer(target: string | HTMLElement, options: PlayerOptions): Player;
export declare function loadYouTubeAPI(): Promise<void>;
/** Original ID-based API. Load YouTube before calling init. */
export declare const csPlayer: {
  init(id: string, options: Pick<PlayerOptions, 'thumbnail' | 'theme' | 'loop' | 'onError'> & { defaultId: string }): Promise<void>;
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
