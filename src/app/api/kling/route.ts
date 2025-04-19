import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/piapi'; // Import uploader from piapi
import { getVideoService } from '@/lib/video-generation'; // Import the video service factory
import { getPublicUrl } from '@/lib/tiktok';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const TMP_DIR = path.join(os.tmpdir(), 'ugcv2');

// Helper function to ensure directory exists (optional, TMP_DIR should exist)
const ensureDirExists = async (dir: string) => {
  try {
    await fs.stat(dir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(dir, { recursive: true });
    } else {
      throw error;
    }
  }
};

// Helper function to download the final video from PiAPI URL
const downloadResultVideo = async (url: string): Promise<string> => {
  try {
    await ensureDirExists(TMP_DIR); // Make sure temp dir exists

    const response = await axios.get(url, { responseType: 'arraybuffer' });
    // Generate a unique path in the correct temp directory
    const outputPath = path.join(TMP_DIR, `${uuidv4()}.mp4`);
    await fs.writeFile(outputPath, response.data);
    console.log(`Downloaded result video to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error downloading result video:', error);
    throw new Error('Failed to download result video from PiAPI');
  }
};


export async function POST(request: NextRequest) {
  try {
    // --- Get data sent from KlingNode.tsx ---
    const { firstFramePath, lastFramePath, prompt } = await request.json();

    console.log('Received Kling request with:');
    console.log('First Frame Path:', firstFramePath);
    console.log('Last Frame Path:', lastFramePath);
    console.log('Prompt:', prompt);

    if (!firstFramePath || !lastFramePath || !prompt) {
      return NextResponse.json(
        { error: 'Frame paths and prompt are required' },
        { status: 400 }
      );
    }

    // --- Step 1: Upload input frames to PiAPI ---
    console.log('Uploading first frame to PiAPI...');
    const piapiFirstFrameUrl = await uploadFile(firstFramePath);
    console.log('Uploaded first frame, URL:', piapiFirstFrameUrl);

    console.log('Uploading last frame to PiAPI...');
    const piapiLastFrameUrl = await uploadFile(lastFramePath);
    console.log('Uploaded last frame, URL:', piapiLastFrameUrl);

    // --- Step 2: Get the video generation service and generate videos ---
    // The service handles task creation and polling internally
    // It expects PiAPI ephemeral URLs as input
    console.log('Getting video generation service...');
    const videoService = getVideoService();
    
    console.log('Calling video generation service with PiAPI URLs...');
    const piapiVideoUrls = await videoService.generateVideo(
      piapiFirstFrameUrl,
      piapiLastFrameUrl,
      prompt
    );
    console.log('Received PiAPI video URLs:', piapiVideoUrls);

    // --- Step 3: Download resulting videos locally ---
    console.log('Downloading result videos locally...');
    const downloadPromises = piapiVideoUrls.map(url => downloadResultVideo(url));
    const localVideoPaths = await Promise.all(downloadPromises);
    console.log('Local video paths:', localVideoPaths);


    // --- Step 4: Get public URLs for frontend display ---
    console.log('Generating public URLs...');
    const publicVideoUrls = localVideoPaths.map(getPublicUrl);
    console.log('Public video URLs:', publicVideoUrls);


    // --- Step 5: Return the result ---
    return NextResponse.json({
      videoPaths: localVideoPaths, // Local paths (e.g., for potential further processing)
      videoUrls: publicVideoUrls, // Public URLs for display in the KlingNode preview
    });

  } catch (error) {
    console.error('Error in Kling API route:', error);
    // Log the detailed error if available
    const errorMessage = error instanceof Error ? error.message : 'Unknown error processing Kling request';
    console.error('Detailed Error:', error); // Log the full error object

    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.stack : null },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic'; // Keep this if needed