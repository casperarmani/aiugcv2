// Node Output Types
export interface DownloaderOutput {
  videoPath: string;
  framePaths: string[];
  frameUrls: string[];
}

export interface FaceSwapOutput {
  swappedFrame0Path: string;
  swappedFrame5Path: string;
  swappedFrame0Url: string;
  swappedFrame5Url: string;
}

export interface KlingOutput {
  videoPaths: string[];
  videoUrls: string[];
}

export interface LipSyncOutput {
  lipsyncedVideoPath: string;
  lipsyncedVideoUrl: string;
}