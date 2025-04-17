import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import os from 'os';

// Syncio API details
const API_BASE_URL = 'https://api.sync.so/v2';
const API_KEY = process.env.SYNCIO_API_KEY;
const TMP_DIR = path.join(os.tmpdir(), 'ugcv2');

/**
 * Creates a lip sync job
 */
export const createLipSyncJob = async (videoPath: string, audioPath: string): Promise<string> => {
  try {
    // Create form data for the files
    const formData = new FormData();
    formData.append('video', fs.createReadStream(videoPath));
    formData.append('audio', fs.createReadStream(audioPath));
    formData.append('model', 'lipsync-2');
    
    const response = await axios.post(`${API_BASE_URL}/generate`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${API_KEY}`,
      },
    });
    
    return response.data.id;
  } catch (error) {
    console.error('Error creating lip sync job:', error);
    throw new Error('Failed to create lip sync job');
  }
};

/**
 * Gets the status of a lip sync job
 */
export const getLipSyncJobStatus = async (jobId: string): Promise<any> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/generate/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting lip sync job status:', error);
    throw new Error('Failed to get lip sync job status');
  }
};

/**
 * Polls a lip sync job until it completes
 */
export const pollLipSyncJob = async (
  jobId: string,
  interval = 5000,
  maxAttempts = 120
): Promise<any> => {
  let attempts = 0;
  
  return new Promise((resolve, reject) => {
    const poll = async () => {
      if (attempts >= maxAttempts) {
        reject(new Error('Polling timed out'));
        return;
      }
      
      try {
        const jobData = await getLipSyncJobStatus(jobId);
        
        if (jobData.status === 'COMPLETED') {
          resolve(jobData);
          return;
        } else if (jobData.status === 'FAILED') {
          reject(new Error(`Job failed: ${jobData.error || 'Unknown error'}`));
          return;
        }
        
        attempts++;
        setTimeout(poll, interval);
      } catch (error) {
        reject(error);
      }
    };
    
    poll();
  });
};

/**
 * Downloads a file from a URL to the temp directory
 */
export const downloadFile = async (url: string): Promise<string> => {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const outputPath = path.join(TMP_DIR, `${uuidv4()}.mp4`);
    
    fs.writeFileSync(outputPath, response.data);
    
    return outputPath;
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error('Failed to download file');
  }
};

/**
 * Performs lip syncing using Syncio API
 */
export const performLipSync = async (videoPath: string, audioPath: string): Promise<string> => {
  try {
    // Create lip sync job
    const jobId = await createLipSyncJob(videoPath, audioPath);
    
    // Poll for completion
    const result = await pollLipSyncJob(jobId);
    
    // Download the result
    const outputPath = await downloadFile(result.output_url);
    
    return outputPath;
  } catch (error) {
    console.error('Error in lip sync process:', error);
    throw new Error('Failed to perform lip sync');
  }
};