// We only use these imports on the server side, not in the browser
import { createTask, uploadFile, pollTask } from './piapi';

// Make sure we're running on the server side before using Node.js features
if (typeof window !== 'undefined') {
  console.warn('video-generation.ts is being imported on the client side. Some features may not work.');
}

/**
 * Interface for video generation services
 */
export interface VideoGenerationService {
  generateVideo(firstFrameUrl: string, lastFrameUrl: string, prompt: string): Promise<string[]>;
}

/**
 * Config for selecting the video generation provider
 */
export type VideoProvider = 'kling' | 'luma';

// Default provider - this can be overridden by the UI
export let VIDEO_GENERATION_PROVIDER: VideoProvider = 'kling';

/**
 * Set the current video generation provider
 */
export function setVideoProvider(provider: VideoProvider): void {
  VIDEO_GENERATION_PROVIDER = provider;
  console.log(`Video provider set to: ${provider}`);
}

/**
 * Implementation for Kling video generation
 */
export class KlingVideoService implements VideoGenerationService {
  async generateVideo(firstFrameUrl: string, lastFrameUrl: string, prompt: string): Promise<string[]> {
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
    } catch (error: unknown) {
      console.error('Error in Kling video generation process:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate videos using Kling: ${errorMessage}`);
    }
  }
}

/**
 * Implementation for Luma video generation
 */
export class LumaVideoService implements VideoGenerationService {
  async generateVideo(firstFrameUrl: string, lastFrameUrl: string, prompt: string): Promise<string[]> {
    try {
      console.log('Preparing Luma task payload...');
      // Create 3 identical tasks for generating previews
      const taskPromises = Array(3).fill(null).map(() => {
        return createTask({
          model: 'luma',
          task_type: 'video_generation',
          input: {
            prompt: prompt,
            key_frames: {
              frame0: { 
                type: 'image', 
                url: firstFrameUrl 
              },
              frame1: { 
                type: 'image', 
                url: lastFrameUrl 
              }
            },
            model_name: 'ray-v2', // Using the newer model
            duration: 5, // 5 second videos
            aspect_ratio: '16:9', // Match current aspect ratio
          },
          config: { 
            service_mode: 'public',
          },
        });
      });
      
      console.log('Creating Luma tasks...');
      const tasks = await Promise.all(taskPromises);
      console.log('Created Luma task IDs:', tasks.map(task => task.task_id));
      
      // Poll all tasks for completion
      console.log('Polling for task completion...');
      const pollPromises = tasks.map(task => pollTask(task.task_id, 5000, 180));
      const results = await Promise.all(pollPromises);
      console.log('All Luma tasks completed!');
      
      // Extract video URLs - adjust based on Luma response format
      const videoUrls = results.map(result => {
        if (result.output && result.output.video_url) {
          return result.output.video_url;
        } else if (result.output && result.output.video) {
          return result.output.video;
        } else {
          console.error('Unexpected Luma output format:', result.output);
          throw new Error('Could not find video URL in Luma task output');
        }
      });
      
      console.log('Extracted video URLs:', videoUrls);
      return videoUrls;
    } catch (error: unknown) {
      console.error('Error in Luma video generation process:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate videos using Luma: ${errorMessage}`);
    }
  }
}

/**
 * Factory function to get the appropriate video service based on configuration
 */
export function getVideoService(): VideoGenerationService {
  if (VIDEO_GENERATION_PROVIDER === 'luma') {
    console.log('Using Luma video generation service');
    return new LumaVideoService();
  }
  console.log('Using Kling video generation service');
  return new KlingVideoService();
}