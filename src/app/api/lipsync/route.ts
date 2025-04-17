import { NextRequest, NextResponse } from 'next/server';
import { downloadTikTok, getPublicUrl } from '@/lib/tiktok';
import { performLipSync } from '@/lib/syncio';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const TMP_DIR = path.join(os.tmpdir(), 'ugcv2');

// Helper function to download audio file
const downloadAudio = async (url: string): Promise<string> => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const outputPath = path.join(TMP_DIR, `${uuidv4()}.mp3`);
  
  fs.writeFileSync(outputPath, response.data);
  
  return outputPath;
};

export async function POST(request: NextRequest) {
  try {
    const { tiktokUrl, audioUrl } = await request.json();
    
    if (!tiktokUrl || !audioUrl) {
      return NextResponse.json(
        { error: 'TikTok URL and audio URL are required' },
        { status: 400 }
      );
    }
    
    // Download the TikTok video
    const videoPath = await downloadTikTok(tiktokUrl);
    
    // Download the audio file
    const audioPath = await downloadAudio(audioUrl);
    
    // Perform lip syncing
    const lipsyncedVideoPath = await performLipSync(videoPath, audioPath);
    
    // Get public URL
    const publicLipsyncedVideoUrl = getPublicUrl(lipsyncedVideoPath);
    
    return NextResponse.json({
      lipsyncedVideoPath,
      lipsyncedVideoUrl: publicLipsyncedVideoUrl,
    });
  } catch (error) {
    console.error('Error in lip sync API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';