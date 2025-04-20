import { useState, useRef } from 'react';
import axios from 'axios';

interface ManualFaceSwapNodeProps {
  id: string;
  data: {
    onSuccess?: (output: ManualFaceSwapOutput) => void;
  };
}

export interface ManualFaceSwapOutput {
  swappedFrame0Path: string;
  swappedFrame1Path: string;
  swappedFrame0Url: string;
  swappedFrame1Url: string;
}

export function ManualFaceSwapNode({ id, data }: ManualFaceSwapNodeProps) {
  const [swapImageUrl, setSwapImageUrl] = useState('https://cdn.discordapp.com/attachments/1109371168147914752/1362909894948294856/winner_5.jpeg?ex=68041c40&is=6802cac0&hm=0ed09618014a78d941567622d1b0c9f4b137141ec07fdcb87eba44318bcbb0cf&');
  const [frame0Url, setFrame0Url] = useState<string | null>(null);
  const [frame1Url, setFrame1Url] = useState<string | null>(null);
  const [frame0Path, setFrame0Path] = useState<string | null>(null);
  const [frame1Path, setFrame1Path] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ swappedFrameUrls: string[] } | null>(null);
  
  const frame0InputRef = useRef<HTMLInputElement>(null);
  const frame1InputRef = useRef<HTMLInputElement>(null);

  const handleFrame0Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setLoading(true);
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setFrame0Path(response.data.filePath);
      setFrame0Url(response.data.fileUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload frame 1');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFrame1Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setLoading(true);
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setFrame1Path(response.data.filePath);
      setFrame1Url(response.data.fileUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload frame 2');
    } finally {
      setLoading(false);
    }
  };

  const runFaceSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!frame0Path || !frame1Path) {
      setError('Please upload both frames first');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/manual-faceswap', {
        frame0Path,
        frame1Path,
        swapImageUrl,
      });
      
      setPreview({
        swappedFrameUrls: [response.data.swappedFrame0Url, response.data.swappedFrame1Url],
      });
      
      // Pass output to parent if callback exists
      if (data.onSuccess) {
        data.onSuccess(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-md w-80 text-black">
      <h3 className="text-lg font-semibold mb-2">Manual Face Swap</h3>
      
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Upload Frames</h4>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-xs font-medium mb-1">Frame 1</label>
            <input
              type="file"
              ref={frame0InputRef}
              onChange={handleFrame0Upload}
              accept="image/*"
              className="text-xs w-full"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Frame 2</label>
            <input
              type="file"
              ref={frame1InputRef}
              onChange={handleFrame1Upload}
              accept="image/*"
              className="text-xs w-full"
              disabled={loading}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {frame0Url && (
            <div className="border rounded overflow-hidden">
              <img 
                src={frame0Url} 
                alt="Frame 1" 
                className="w-full h-auto"
              />
              <div className="text-xs text-center py-1">Frame 1</div>
            </div>
          )}
          {frame1Url && (
            <div className="border rounded overflow-hidden">
              <img 
                src={frame1Url} 
                alt="Frame 2" 
                className="w-full h-auto"
              />
              <div className="text-xs text-center py-1">Frame 2</div>
            </div>
          )}
        </div>
      </div>
      
      <form onSubmit={runFaceSwap}>
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
          disabled={loading || !frame0Path || !frame1Path}
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
                  alt={`Swapped Frame ${index + 1}`} 
                  className="w-full h-auto"
                />
                <div className="text-xs text-center py-1">
                  {`Swapped Frame ${index + 1}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}