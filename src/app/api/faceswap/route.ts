import { NextRequest, NextResponse } from 'next/server';
import { faceSwap } from '@/lib/piapi';
import { getPublicUrl } from '@/lib/tiktok';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const TMP_DIR = path.join(os.tmpdir(), 'ugcv2');

// Helper function to download image from URL
const downloadImage = async (url: string): Promise<string> => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const outputPath = path.join(TMP_DIR, `${uuidv4()}.jpg`);
  
  fs.writeFileSync(outputPath, response.data);
  
  return outputPath;
};

export async function POST(request: NextRequest) {
  try {
    const { frame0Path, frame5Path, swapImageUrl } = await request.json();
    
    if (!frame0Path || !frame5Path || !swapImageUrl) {
      return NextResponse.json(
        { error: 'All parameters are required' },
        { status: 400 }
      );
    }
    
    // Perform face swap on both frames
    const swappedFrame0Url = await faceSwap(frame0Path, swapImageUrl);
    const swappedFrame5Url = await faceSwap(frame5Path, swapImageUrl);
    
    // Download swapped images to local temp directory
    const swappedFrame0Path = await downloadImage(swappedFrame0Url);
    const swappedFrame5Path = await downloadImage(swappedFrame5Url);
    
    // Get public URLs
    const publicSwappedFrame0Url = getPublicUrl(swappedFrame0Path);
    const publicSwappedFrame5Url = getPublicUrl(swappedFrame5Path);
    
    return NextResponse.json({
      swappedFrame0Path,
      swappedFrame5Path,
      swappedFrame0Url: publicSwappedFrame0Url,
      swappedFrame5Url: publicSwappedFrame5Url,
    });
  } catch (error) {
    console.error('Error in face swap API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';