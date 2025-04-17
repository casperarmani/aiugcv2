import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import ytDlpExec from 'yt-dlp-exec';
import ffmpeg from 'fluent-ffmpeg';

// Configure ffmpeg
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

// Create temp directory
const TMP_DIR = path.join(os.tmpdir(), 'ugcv2');
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// Helper function to create a unique filename
const createTempFilename = (extension: string): string => {
  return path.join(TMP_DIR, `${uuidv4()}.${extension}`);
};

/**
 * Downloads a TikTok video and returns the file path
 */
export const downloadTikTok = async (url: string): Promise<string> => {
  const outputPath = createTempFilename('mp4');
  
  try {
    await ytDlpExec(url, {
      output: outputPath,
      format: 'mp4',
    });
    
    return outputPath;
  } catch (error) {
    console.error('Error downloading TikTok video:', error);
    throw new Error('Failed to download TikTok video');
  }
};

/**
 * Extracts frames from a video at specific time points
 */
export const extractFrames = async (
  videoPath: string,
  timePoints: number[] = [0, 5]
): Promise<string[]> => {
  const framePaths = timePoints.map(() => createTempFilename('jpg'));
  
  const extractPromises = timePoints.map((time, index) => {
    return new Promise<string>((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshot({
          timestamps: [time],
          filename: path.basename(framePaths[index]),
          folder: TMP_DIR,
        })
        .on('end', () => resolve(framePaths[index]))
        .on('error', (err) => {
          console.error(`Error extracting frame at ${time}s:`, err);
          reject(new Error(`Failed to extract frame at ${time}s`));
        });
    });
  });
  
  return Promise.all(extractPromises);
};

/**
 * Cleans up temporary files
 */
export const cleanupTempFiles = (filePaths: string[]): void => {
  filePaths.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
};

/**
 * Returns the public URL for a file path
 */
export const getPublicUrl = (filePath: string): string => {
  // Create a symbolic link in the public directory
  const fileName = path.basename(filePath);
  const publicPath = path.join(process.cwd(), 'public', 'temp', fileName);
  
  // Create symlink if it doesn't exist
  if (!fs.existsSync(publicPath)) {
    fs.copyFileSync(filePath, publicPath);
  }
  
  return `/temp/${fileName}`;
};