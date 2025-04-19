import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// PiAPI endpoints - Updated to latest URLs
const API_BASE_URL = 'https://api.piapi.ai/api/v1'; // v1 API
const UPLOAD_HOST = 'https://upload.theapi.app';
const API_KEY = process.env.PIAPI_KEY;

/**
 * Creates a task in PiAPI
 */
export const createTask = async (body: any): Promise<any> => {
  try {
    console.log('Sending task to PiAPI:', JSON.stringify(body, null, 2));
    const response = await axios.post(
      `${API_BASE_URL}/task`,
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': API_KEY
        }
      }
    );
    
    console.log('CreateTask response:', JSON.stringify(response.data, null, 2));
    
    // PiAPI returns task info in data.data
    if (response.data && response.data.data && response.data.data.task_id) {
      return response.data.data;
    } else {
      console.error('Unexpected response format:', response.data);
      throw new Error('Unexpected response format from PiAPI');
    }
  } catch (error) {
    console.error('Error creating PiAPI task:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    throw new Error(`Failed to create PiAPI task: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Uploads a file to PiAPI
 */
export const uploadFile = async (filePath: string): Promise<string> => {
  try {
    // Read file as base64
    const fileData = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    const base64Data = fileData.toString('base64');
    
    // Use the new endpoint with JSON payload
    const response = await axios.post(
      `${UPLOAD_HOST}/api/ephemeral_resource`,
      {
        file_name: fileName,
        file_data: base64Data
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': API_KEY
        }
      }
    );
    
    // The response structure is different in the new API
    return response.data.data.url;
  } catch (error) {
    console.error('Error uploading file to PiAPI:', error);
    throw new Error('Failed to upload file to PiAPI');
  }
};

/**
 * Gets the status of a task
 */
export const getTaskStatus = async (taskId: string): Promise<any> => {
  try {
    console.log(`Getting status for task ${taskId}...`);
    const response = await axios.get(
      `${API_BASE_URL}/task/${taskId}`, 
      {
        headers: {
          'X-API-KEY': API_KEY
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error getting task status:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw new Error(`Failed to get task status: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Polls a task until it completes
 */
export const pollTask = async (
  taskId: string,
  interval = 2000,
  maxAttempts = 150
): Promise<any> => {
  let attempts = 0;
  
  return new Promise((resolve, reject) => {
    const poll = async () => {
      if (attempts >= maxAttempts) {
        reject(new Error('Polling timed out'));
        return;
      }
      
      try {
        const response = await getTaskStatus(taskId);
        console.log(`Poll attempt ${attempts+1}, status:`, response?.data?.status || 'unknown');
        
        // Handle the response data structure (status is in response.data.status)
        const taskData = response.data || response;
        
        if (taskData.status === 'completed') {
          console.log('Task completed successfully');
          resolve(taskData);
          return;
        } else if (taskData.status === 'failed') {
          const errorMsg = taskData.error?.message || 'Unknown error';
          console.error('Task failed:', errorMsg);
          reject(new Error(`Task failed: ${errorMsg}`));
          return;
        }
        
        attempts++;
        setTimeout(poll, interval);
      } catch (error) {
        console.error(`Poll attempt ${attempts+1} failed:`, error);
        // For transient errors, keep trying
        attempts++;
        setTimeout(poll, interval);
      }
    };
    
    poll();
  });
};

/**
 * Face swap function using PiAPI
 */
// Define temp directory
const TMP_DIR = path.join(os.tmpdir(), 'ugcv2');

// Helper function to ensure directory exists
const ensureDirExists = async (dir: string): Promise<void> => {
  try {
    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) {
      await fs.mkdir(dir, { recursive: true });
    }
  } catch (error) {
    await fs.mkdir(dir, { recursive: true });
  }
};

// Helper function to download image to temp file
const downloadFileLocally = async (url: string): Promise<string> => {
  try {
    // Make sure directory exists
    await ensureDirExists(TMP_DIR);
    
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const outputPath = path.join(TMP_DIR, `swap-${Date.now()}.jpg`);
    await fs.writeFile(outputPath, response.data);
    return outputPath;
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error('Failed to download file');
  }
};

export const faceSwap = async (targetImagePath: string, swapImageUrl: string): Promise<string> => {
  try {
    console.log('Starting face swap with target:', targetImagePath);
    console.log('Using swap image URL:', swapImageUrl);
    
    // Upload target image
    const targetImageUrl = await uploadFile(targetImagePath);
    console.log('Uploaded target image, got URL:', targetImageUrl);
    
    // Download swap image to local file, then upload it to get a proper URL
    console.log('Downloading swap image to local file...');
    const swapLocalPath = await downloadFileLocally(swapImageUrl);
    console.log('Swap image downloaded to:', swapLocalPath);
    
    // Upload swap image to get URL with proper extension
    const swapImageUrl2 = await uploadFile(swapLocalPath);
    console.log('Uploaded swap image, got URL:', swapImageUrl2);
    
    // Use exact model and task type as specified in docs
    const payload = {
      model: 'Qubico/image-toolkit',  // Full name as required
      task_type: 'face-swap',         // With dash, not underscore
      input: {
        target_image: targetImageUrl,
        swap_image: swapImageUrl2     // Use the properly uploaded URL
      },
      config: {
        service_mode: 'public'
      }
    };
    
    console.log('Creating face swap task with payload:', JSON.stringify(payload, null, 2));
    
    // Create face swap task
    const taskData = await createTask(payload);
    console.log('Task created with ID:', taskData.task_id);
    
    // Poll for completion
    console.log('Polling for task completion...');
    const result = await pollTask(taskData.task_id);
    console.log('Task completed! Result:', JSON.stringify(result.output, null, 2));
    
    // Get the output URL - handle different possible response formats
    if (result.output && result.output.image_url) {
      return result.output.image_url;
    } else if (result.output && result.output.images && result.output.images.length > 0) {
      return result.output.images[0];
    } else {
      console.error('Unexpected output format:', result);
      throw new Error('Could not find image URL in response');
    }
  } catch (error) {
    console.error('Error in face swap process:', error);
    throw new Error('Failed to perform face swap');
  }
};

/**
 * Kling 2.0 video generation using PiAPI
 */
export const generateKlingVideo = async (
  firstFrameUrl: string,
  lastFrameUrl: string,
  prompt: string
): Promise<string[]> => {
  try {
    console.log('Preparing Kling task payload...');
    // Create 3 identical tasks for generating previews
    const taskPromises = Array(3).fill(null).map(() => {
      return createTask({
        model: 'kling',
        task_type: 'video_generation', 
        input: {
          prompt: prompt,
          image_url: firstFrameUrl,
          image_tail_url: lastFrameUrl,
          mode: 'pro',
          version: '1.6', // Ensure version 1.6 is used
          aspect_ratio: '16:9', // Set default aspect ratio
        },
        config: { 
          service_mode: 'public',
        },
      });
    });
    
    console.log('Creating Kling tasks...');
    const tasks = await Promise.all(taskPromises);
    console.log('Created Kling task IDs:', tasks.map(task => task.task_id));
    
    // Poll all tasks for completion
    console.log('Polling for task completion...');
    const pollPromises = tasks.map(task => pollTask(task.task_id, 5000, 180));
    const results = await Promise.all(pollPromises);
    console.log('All Kling tasks completed!');
    
    // Extract video URLs
    const videoUrls = results.map(result => {
      if (result.output && result.output.video_url) {
        return result.output.video_url;
      } else {
        console.error('Unexpected Kling output format:', result.output);
        throw new Error('Could not find video_url in Kling task output');
      }
    });
    
    console.log('Extracted video URLs:', videoUrls);
    return videoUrls;
  } catch (error) {
    console.error('Error in Kling video generation process:', error);
    throw new Error(`Failed to generate videos using Kling 2.0: ${error.message}`);
  }
};