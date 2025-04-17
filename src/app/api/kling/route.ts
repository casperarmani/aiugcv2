import { NextRequest, NextResponse } from 'next/server';
import { generateKlingVideo } from '@/lib/piapi';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { getPublicUrl } from '@/lib/tiktok';

const TMP_DIR = path.join(os.tmpdir(), 'ugcv2');

// Helper function to download video from URL
const downloadVideo = async (url: string): Promise<string> => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const outputPath = path.join(TMP_DIR, `${uuidv4()}.mp4`);
  
  fs.writeFileSync(outputPath, response.data);
  
  return outputPath;
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
    
    // Generate videos using Kling 2.0
    const videoUrls = await generateKlingVideo(firstFrameUrl, lastFrameUrl, prompt);
    
    // Download videos to local temp directory
    const videoPaths = await Promise.all(videoUrls.map(url => downloadVideo(url)));
    
    // Get public URLs
    const publicVideoUrls = videoPaths.map(getPublicUrl);
    
    return NextResponse.json({
      videoPaths,
      videoUrls: publicVideoUrls,
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