import { useState } from 'react';
import axios from 'axios';

interface DownloaderNodeProps {
  id: string;
  data: {
    onSuccess: (output: DownloaderOutput) => void;
  };
}

export interface DownloaderOutput {
  videoPath: string;
  framePaths: string[];
  frameUrls: string[];
}

export function DownloaderNode({ id, data }: DownloaderNodeProps) {
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ frameUrls: string[] } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/download', {
        tiktokUrl,
      });
      
      setPreview({
        frameUrls: response.data.frameUrls,
      });
      
      // Pass output to parent node
      data.onSuccess(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-md w-80">
      <h3 className="text-lg font-semibold mb-2">TikTok Downloader</h3>
      
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
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-sm disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Extract Frames'}
        </button>
      </form>
      
      {error && (
        <div className="mt-2 p-2 bg-red-100 text-red-600 rounded text-sm">
          {error}
        </div>
      )}
      
      {preview && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Extracted Frames</h4>
          <div className="grid grid-cols-2 gap-2">
            {preview.frameUrls.map((url, index) => (
              <div key={index} className="border rounded overflow-hidden">
                <img 
                  src={url} 
                  alt={`Frame ${index}`} 
                  className="w-full h-auto"
                />
                <div className="text-xs text-center py-1">
                  {index === 0 ? 'Start Frame' : 'Frame at 5s'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}