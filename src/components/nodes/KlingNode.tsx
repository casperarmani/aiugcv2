import { useState } from 'react';
import axios from 'axios';
import { FaceSwapOutput } from './FaceSwapNode';

interface KlingNodeProps {
  id: string;
  data: {
    inputData?: FaceSwapOutput;
    onSuccess: (output: KlingOutput) => void;
  };
}

export interface KlingOutput {
  videoPaths: string[];
  videoUrls: string[];
}

export function KlingNode({ id, data }: KlingNodeProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ videoUrls: string[] } | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!data.inputData) {
      setError('No input frames available. Please process face swap first.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Make API call to generate videos
      const response = await axios.post('/api/kling', {
        firstFramePath: data.inputData.swappedFrame0Path,
        lastFramePath: data.inputData.swappedFrame5Path,
        prompt,
      });
      
      setPreview({
        videoUrls: response.data.videoUrls,
      });
      
      // Pass output to parent node
      data.onSuccess(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadVideo = (url: string, index: number) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `kling-video-${index + 1}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-md w-80 text-black">
      <h3 className="text-lg font-semibold mb-2">Kling 1.6 Generator</h3>
      
      {data.inputData ? (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Input Frames</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="border rounded overflow-hidden">
              <img 
                src={data.inputData.swappedFrame0Url} 
                alt="First Frame" 
                className="w-full h-auto"
              />
              <div className="text-xs text-center py-1">
                Start Frame
              </div>
            </div>
            <div className="border rounded overflow-hidden">
              <img 
                src={data.inputData.swappedFrame5Url} 
                alt="Last Frame" 
                className="w-full h-auto"
              />
              <div className="text-xs text-center py-1">
                End Frame
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-2 bg-yellow-100 text-yellow-700 rounded text-sm">
          No input frames available. Please process face swap first.
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a detailed prompt..."
            className="w-full p-2 border rounded text-sm text-black"
            rows={3}
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading || !data.inputData}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-sm disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Videos'}
        </button>
      </form>
      
      {error && (
        <div className="mt-2 p-2 bg-red-100 text-red-600 rounded text-sm">
          {error}
        </div>
      )}
      
      {preview && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Generated Videos</h4>
          <div className="grid grid-cols-3 gap-2">
            {preview.videoUrls.map((url, index) => (
              <div 
                key={index} 
                className={`border rounded overflow-hidden ${selectedVideo === index ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => setSelectedVideo(index)}
              >
                <video 
                  src={url} 
                  controls
                  className="w-full h-auto"
                />
                <div className="flex justify-between items-center px-1 py-1">
                  <span className="text-xs">Version {index + 1}</span>
                  <button
                    className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded"
                    onClick={() => downloadVideo(url, index)}
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}