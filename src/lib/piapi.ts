import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

// PiAPI endpoints
const API_BASE_URL = 'https://app.piapi.ai/api/v2';
const API_KEY = process.env.PIAPI_KEY;

/**
 * Creates a task in PiAPI
 */
export const createTask = async (body: any): Promise<any> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/task`, body, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating PiAPI task:', error);
    throw new Error('Failed to create PiAPI task');
  }
};

/**
 * Uploads a file to PiAPI
 */
export const uploadFile = async (filePath: string): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        'x-api-key': API_KEY,
      },
    });
    
    return response.data.url;
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
    const response = await axios.get(`${API_BASE_URL}/task/${taskId}`, {
      headers: {
        'x-api-key': API_KEY,
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting task status:', error);
    throw new Error('Failed to get task status');
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
        const taskData = await getTaskStatus(taskId);
        
        if (taskData.status === 'completed') {
          resolve(taskData);
          return;
        } else if (taskData.status === 'failed') {
          reject(new Error(`Task failed: ${taskData.error || 'Unknown error'}`));
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
 * Face swap function using PiAPI
 */
export const faceSwap = async (targetImagePath: string, swapImageUrl: string): Promise<string> => {
  try {
    // Upload target image
    const targetImageUrl = await uploadFile(targetImagePath);
    
    // Create face swap task
    const taskData = await createTask({
      model: 'Qubico/image-toolkit',
      task_type: 'face-swap',
      input: {
        target_image: targetImageUrl,
        swap_image: swapImageUrl,
      },
    });
    
    // Poll for completion
    const result = await pollTask(taskData.id);
    
    return result.output.image_url;
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
          version: '2.0',
        },
        config: { 
          service_mode: 'public',
        },
      });
    });
    
    const tasks = await Promise.all(taskPromises);
    
    // Poll all tasks for completion
    const pollPromises = tasks.map(task => pollTask(task.id));
    const results = await Promise.all(pollPromises);
    
    // Extract video URLs
    return results.map(result => result.output.video_url);
  } catch (error) {
    console.error('Error in Kling video generation process:', error);
    throw new Error('Failed to generate videos using Kling 2.0');
  }
};