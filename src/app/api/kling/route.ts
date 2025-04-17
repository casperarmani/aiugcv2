import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import fs from 'fs/promises';
import { existsSync, writeFileSync } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { getPublicUrl } from '@/lib/tiktok';

const TMP_DIR = path.join(os.tmpdir(), 'ugcv2');

// Helper function to download test video
const downloadTestVideo = async (): Promise<string> => {
  try {
    // Create a sample MP4 URL - this is a test video
    const testVideoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    
    // Download the video
    const response = await axios.get(testVideoUrl, {
      responseType: 'arraybuffer'
    });
    
    // Save to a temporary file
    const outputPath = path.join(TMP_DIR, `${uuidv4()}.mp4`);
    await fs.writeFile(outputPath, response.data);
    
    return outputPath;
  } catch (error) {
    console.error('Error downloading test video:', error);
    throw new Error('Failed to download test video');
  }
};

export async function POST(request: NextRequest) {
  try {
    const { firstFrameUrl, lastFrameUrl, prompt } = await request.json();
    
    if (!firstFrameUrl || !lastFrameUrl || !prompt) {
      return NextResponse.json(
        { error: 'All parameters are required' },
        { status: 400 }
      );
    }
    
    // Download 3 test videos as a mock response
    const videoPromises = Array(3).fill(null).map(() => downloadTestVideo());
    const videoPaths = await Promise.all(videoPromises);
    
    // Get public URLs
    const videoUrls = videoPaths.map(getPublicUrl);
    
    return NextResponse.json({
      videoPaths,
      videoUrls,
    });
  } catch (error) {
    console.error('Error in Kling API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';