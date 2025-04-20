import { NextRequest, NextResponse } from 'next/server';
import { faceSwap } from '@/lib/piapi';
import { getPublicUrl } from '@/lib/tiktok';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const TMP_DIR = path.join(os.tmpdir(), 'ugcv2');

// Helper function to download image from URL
const downloadImage = async (url: string): Promise<string> => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const outputPath = path.join(TMP_DIR, `${uuidv4()}.jpg`);
  await fs.writeFile(outputPath, response.data);
  return outputPath;
};

// Manual frame swap API route
export async function POST(request: NextRequest) {
  try {
    const { frame0Path, frame1Path, swapImageUrl } = await request.json();
    
    if (!frame0Path || !frame1Path || !swapImageUrl) {
      return NextResponse.json(
        { error: 'All parameters are required' },
        { status: 400 }
      );
    }
    
    // Perform face swap on both frames using PiAPI
    const swappedFrame0Url = await faceSwap(frame0Path, swapImageUrl);
    const swappedFrame1Url = await faceSwap(frame1Path, swapImageUrl);
    
    // Download the swapped images
    const swappedFrame0Path = await downloadImage(swappedFrame0Url);
    const swappedFrame1Path = await downloadImage(swappedFrame1Url);
    
    // Get public URLs
    const publicSwappedFrame0Url = getPublicUrl(swappedFrame0Path);
    const publicSwappedFrame1Url = getPublicUrl(swappedFrame1Path);
    
    return NextResponse.json({
      swappedFrame0Path,
      swappedFrame1Path,
      swappedFrame0Url: publicSwappedFrame0Url,
      swappedFrame1Url: publicSwappedFrame1Url
    });
  } catch (error) {
    console.error('Error in manual frame swap API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';