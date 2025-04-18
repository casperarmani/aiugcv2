import { useState, useEffect } from 'react';
import axios from 'axios';
import { DownloaderOutput } from './DownloaderNode';

interface FaceSwapNodeProps {
  id: string;
  data: {
    inputData?: DownloaderOutput;
    onSuccess: (output: FaceSwapOutput) => void;
    autoRun?: boolean;
  };
}

export interface FaceSwapOutput {
  swappedFrame0Path: string;
  swappedFrame5Path: string;
  swappedFrame0Url: string;
  swappedFrame5Url: string;
}

export function FaceSwapNode({ id, data }: FaceSwapNodeProps) {
  const [swapImageUrl, setSwapImageUrl] = useState('https://cdn.discordapp.com/attachments/1109371168147914752/1362909894948294856/winner_5.jpeg?ex=68041c40&is=6802cac0&hm=0ed09618014a78d941567622d1b0c9f4b137141ec07fdcb87eba44318bcbb0cf&');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ swappedFrameUrls: string[] } | null>(null);

  // Auto-run effect when inputData changes and we have a swapImageUrl
  useEffect(() => {
    if (data.inputData && swapImageUrl && !loading && !preview) {
      runFaceSwap();
    }
  }, [data.inputData]);

  const runFaceSwap = async () => {
    if (!data.inputData) {
      setError('No input frames available. Please process a TikTok video first.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/faceswap', {
        frame0Path: data.inputData.framePaths[0],
        frame5Path: data.inputData.framePaths[1],
        swapImageUrl,
      });
      
      setPreview({
        swappedFrameUrls: [response.data.swappedFrame0Url, response.data.swappedFrame5Url],
      });
      
      // Pass output to parent node
      data.onSuccess(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runFaceSwap();
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-md w-80 text-black">
      <h3 className="text-lg font-semibold mb-2">Face Swap</h3>
      
      {data.inputData ? (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Input Frames</h4>
          <div className="grid grid-cols-2 gap-2">
            {data.inputData.frameUrls.map((url, index) => (
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
      ) : (
        <div className="mb-4 p-2 bg-yellow-100 text-yellow-700 rounded text-sm">
          No input frames available. Please process a TikTok video first.
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">
            Face Image URL
          </label>
          <input
            type="text"
            value={swapImageUrl}
            onChange={(e) => setSwapImageUrl(e.target.value)}
            placeholder="https://example.com/face.jpg"
            className="w-full p-2 border rounded text-sm text-black"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading || !data.inputData}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-sm disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Swap Face'}
        </button>
      </form>
      
      {error && (
        <div className="mt-2 p-2 bg-red-100 text-red-600 rounded text-sm">
          {error}
        </div>
      )}
      
      {preview && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Swapped Frames</h4>
          <div className="grid grid-cols-2 gap-2">
            {preview.swappedFrameUrls.map((url, index) => (
              <div key={index} className="border rounded overflow-hidden">
                <img 
                  src={url} 
                  alt={`Swapped Frame ${index}`} 
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