# TikTok Video Processing Workflow

A Next.js application that processes TikTok videos through a node-based workflow, including:

1. TikTok video downloading and frame extraction
2. Face swapping using PiAPI
3. Video generation with Kling 2.0 model
4. TikTok video lip syncing with Syncio API

## Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with the following variables:

```
PIAPI_KEY=your_piapi_key_here
SYNCIO_API_KEY=your_syncio_api_key_here
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Keys

### PiAPI
- Sign up at [app.piapi.ai](https://app.piapi.ai)
- Navigate to Workspace > API Keys
- Copy your API key and add it to the `.env.local` file

### Syncio
- Sign up at [sync.so](https://sync.so)
- Navigate to Dashboard > Developer > API Keys
- Copy your API key and add it to the `.env.local` file

## How to Use

The application provides a node-based interface with four main nodes:

1. **TikTok Downloader**: Input a TikTok URL and extract frames
2. **Face Swap**: Upload a face image to swap onto the extracted frames
3. **Kling 2.0 Generator**: Generate videos from the face-swapped frames
4. **Lip Sync**: Input a TikTok URL and audio URL to create a lip-synced video

The first three nodes are connected in sequence, while the lip sync node operates independently.

## Technical Details

- Next.js 15 with React 19
- ReactFlow for the node-based interface
- yt-dlp for TikTok video downloading
- ffmpeg for video processing
- PiAPI for face swapping and video generation
- Syncio API for lip syncing

## Notes

- Temporary files are stored in `/tmp/ugcv2` and linked to the public folder
- This is a development build and not intended for production use
- API rate limits may apply depending on your PiAPI and Syncio subscriptions