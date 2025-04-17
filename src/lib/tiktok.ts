import path from 'path';
import os from 'os';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import ytdlp from 'youtube-dl-exec';
import ffmpeg from 'fluent-ffmpeg';
import { exec } from 'child_process';
import { promisify } from 'util';

// Use system ffmpeg instead of the npm package
ffmpeg.setFfmpegPath('/usr/local/bin/ffmpeg');

// Create temp directory
const TMP_DIR = path.join(os.tmpdir(), 'ugcv2');
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// Helper function to create a unique filename
const createTempFilename = (extension: string): string => {
  return path.join(TMP_DIR, `${uuidv4()}.${extension}`);
};

const execAsync = promisify(exec);

/**
 * Downloads a TikTok video and returns the file path
 */
export const downloadTikTok = async (url: string): Promise<string> => {
  const outputPath = createTempFilename('mp4');
  
  try {
    // Use the system yt-dlp binary (installed via pip or brew)
    try {
      // Use the exact path from the system
      await execAsync(`/Library/Frameworks/Python.framework/Versions/3.11/bin/yt-dlp "${url}" -o "${outputPath}" -f mp4 --no-check-certificates`);
      return outputPath;
    } catch (systemError) {
      console.error('Error with system yt-dlp:', systemError);
      
      try {
        // Try with the npm package as a fallback
        await ytdlp.exec(url, {
          output: outputPath,
          format: 'mp4',
          noCheckCertificates: true
        }, {
          stdio: 'ignore'
        });
      } catch (packageError) {
        console.error('Error with npm package yt-dlp:', packageError);
        throw new Error('Failed to download TikTok video with both system and npm yt-dlp');
      }
    }
    
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
  
  // Alternative extraction method using exec
  const extractFramesWithExec = async (time: number, outputPath: string): Promise<string> => {
    try {
      await execAsync(`/usr/local/bin/ffmpeg -i "${videoPath}" -ss ${time} -vframes 1 -q:v 2 "${outputPath}"`);
      return outputPath;
    } catch (error) {
      console.error(`Error extracting frame with exec at ${time}s:`, error);
      throw new Error(`Failed to extract frame at ${time}s using exec`);
    }
  };
  
  const extractPromises = timePoints.map((time, index) => {
    return new Promise<string>(async (resolve, reject) => {
      try {
        // First try with fluent-ffmpeg
        ffmpeg(videoPath)
          .screenshot({
            timestamps: [time],
            filename: path.basename(framePaths[index]),
            folder: TMP_DIR,
          })
          .on('end', () => resolve(framePaths[index]))
          .on('error', async (err) => {
            console.error(`Error extracting frame with fluent-ffmpeg at ${time}s:`, err);
            
            // If fluent-ffmpeg fails, try direct exec approach
            try {
              const resultPath = await extractFramesWithExec(time, framePaths[index]);
              resolve(resultPath);
            } catch (execError) {
              reject(new Error(`Failed to extract frame at ${time}s with both methods`));
            }
          });
      } catch (error) {
        // If fluent-ffmpeg throws, try direct exec approach
        try {
          const resultPath = await extractFramesWithExec(time, framePaths[index]);
          resolve(resultPath);
        } catch (execError) {
          reject(new Error(`Failed to extract frame at ${time}s with both methods`));
        }
      }
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
  try {
    // Get the file name from the path
    const fileName = path.basename(filePath);
    
    // Create the temp directory in public if it doesn't exist
    const publicTempDir = path.join(process.cwd(), 'public', 'temp');
    if (!fs.existsSync(publicTempDir)) {
      fs.mkdirSync(publicTempDir, { recursive: true });
    }
    
    const publicPath = path.join(publicTempDir, fileName);
    
    // Copy the file to the public directory
    if (!fs.existsSync(publicPath)) {
      fs.copyFileSync(filePath, publicPath);
      
      // Set readable permissions
      fs.chmodSync(publicPath, 0o644);
    }
    
    return `/temp/${fileName}`;
  } catch (error) {
    console.error('Error creating public URL:', error);
    // Return a fallback URL if there's an error
    return `/temp/error-${Date.now()}.jpg`;
  }
};