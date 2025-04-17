import { NextRequest, NextResponse } from 'next/server';
import { faceSwap } from '@/lib/piapi';
import { getPublicUrl } from '@/lib/tiktok';
import axios from 'axios';
import fs from 'fs/promises';
import { existsSync, writeFileSync } from 'fs';
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

// Helper function to upload file to PiAPI
const uploadFile = async (filePath: string): Promise<string> => {
  try {
    const fileData = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    const base64Data = fileData.toString('base64');
    
    const response = await axios.post(
      `https://upload.theapi.app/api/ephemeral_resource`,
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
    
    return response.data.data.url;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
};

// Face swap API route
export async function POST(request: NextRequest) {
  try {
    const { frame0Path, frame5Path, swapImageUrl } = await request.json();
    
    if (!frame0Path || !frame5Path || !swapImageUrl) {
      return NextResponse.json(
        { error: 'All parameters are required' },
        { status: 400 }
      );
    }
    
    // Perform face swap on both frames using PiAPI
    const swappedFrame0Url = await faceSwap(frame0Path, swapImageUrl);
    const swappedFrame5Url = await faceSwap(frame5Path, swapImageUrl);
    
    // Download the swapped images
    const swappedFrame0Path = await downloadImage(swappedFrame0Url);
    const swappedFrame5Path = await downloadImage(swappedFrame5Url);
    
    // Get public URLs
    const publicSwappedFrame0Url = getPublicUrl(swappedFrame0Path);
    const publicSwappedFrame5Url = getPublicUrl(swappedFrame5Path);
    
    return NextResponse.json({
      swappedFrame0Path,
      swappedFrame5Path,
      swappedFrame0Url: publicSwappedFrame0Url,
      swappedFrame5Url: publicSwappedFrame5Url
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