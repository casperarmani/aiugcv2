import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { getPublicUrl } from '@/lib/tiktok';

// Define temporary directory for uploads
const TMP_DIR = path.join(os.tmpdir(), 'ugcv2');

// Helper function to ensure directory exists
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

export async function POST(request: NextRequest) {
  try {
    // Ensure temp directory exists
    await ensureDirExists(TMP_DIR);
    
    // Get form data with the file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Get file extension
    const fileExt = path.extname(file.name) || '.jpg';
    
    // Create a unique filename
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = path.join(TMP_DIR, fileName);
    
    // Convert file to buffer and save it
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    
    // Generate public URL for frontend
    const fileUrl = getPublicUrl(filePath);
    
    return NextResponse.json({
      filePath,
      fileUrl
    });
  } catch (error) {
    console.error('Error handling file upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const config = {
  api: {
    bodyParser: false, // Don't parse the files, handle it manually
  },
};