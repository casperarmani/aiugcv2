import { NextRequest, NextResponse } from 'next/server';
import { downloadTikTok, extractFrames, getPublicUrl } from '@/lib/tiktok';

export async function POST(request: NextRequest) {
  try {
    const { tiktokUrl } = await request.json();
    
    if (!tiktokUrl) {
      return NextResponse.json(
        { error: 'TikTok URL is required' },
        { status: 400 }
      );
    }
    
    // Download the TikTok video
    const videoPath = await downloadTikTok(tiktokUrl);
    
    // Extract frames at 0s and 5s
    const framePaths = await extractFrames(videoPath, [0, 5]);
    
    // Get public URLs for the frames
    const frameUrls = framePaths.map(getPublicUrl);
    
    return NextResponse.json({
      videoPath,
      framePaths,
      frameUrls,
    });
  } catch (error) {
    console.error('Error in download API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';