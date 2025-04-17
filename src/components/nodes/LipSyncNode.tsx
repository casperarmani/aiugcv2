import { useState } from 'react';
import axios from 'axios';

interface LipSyncNodeProps {
  id: string;
  data: {
    onSuccess: (output: LipSyncOutput) => void;
  };
}

export interface LipSyncOutput {
  lipsyncedVideoPath: string;
  lipsyncedVideoUrl: string;
}

export function LipSyncNode({ id, data }: LipSyncNodeProps) {
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ videoUrl: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/lipsync', {
        tiktokUrl,
        audioUrl,
      });
      
      setPreview({
        videoUrl: response.data.lipsyncedVideoUrl,
      });
      
      // Pass output to parent node
      data.onSuccess(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadVideo = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lipsynced-video.mp4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-md w-80">
      <h3 className="text-lg font-semibold mb-2">Lip Sync</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">
            TikTok URL
          </label>
          <input
            type="text"
            value={tiktokUrl}
            onChange={(e) => setTiktokUrl(e.target.value)}
            placeholder="https://www.tiktok.com/..."
            className="w-full p-2 border rounded text-sm"
            required
          />
        </div>
        
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">
            Audio URL
          </label>
          <input
            type="text"
            value={audioUrl}
            onChange={(e) => setAudioUrl(e.target.value)}
            placeholder="https://example.com/audio.mp3"
            className="w-full p-2 border rounded text-sm"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-sm disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Generate Lip Sync'}
        </button>
      </form>
      
      {error && (
        <div className="mt-2 p-2 bg-red-100 text-red-600 rounded text-sm">
          {error}
        </div>
      )}
      
      {preview && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Lip Synced Video</h4>
          <div className="border rounded overflow-hidden">
            <video 
              src={preview.videoUrl} 
              controls
              className="w-full h-auto"
            />
            <div className="flex justify-end p-1">
              <button
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
                onClick={() => downloadVideo(preview.videoUrl)}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}