import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaceSwapOutput } from './FaceSwapNode';
import { VideoProvider, setVideoProvider } from '@/lib/video-generation';

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
  const [videoProvider, setVideoProviderState] = useState<VideoProvider>('kling');
  
  // Update the global provider setting when the local state changes
  useEffect(() => {
    setVideoProvider(videoProvider);
  }, [videoProvider]);

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
    link.download = `generated-video-${index + 1}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-md w-[640px] h-[960px] overflow-auto text-black">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-semibold">Video Generator</h3>
        <div className="flex items-center">
          <label className="text-sm mr-1">Provider:</label>
          <select 
            value={videoProvider}
            onChange={(e) => setVideoProviderState(e.target.value as VideoProvider)}
            className="text-sm p-1 border rounded bg-white text-black"
            disabled={loading}
          >
            <option value="kling">Kling</option>
            <option value="luma">Luma AI</option>
          </select>
        </div>
      </div>
      
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
      
      <div className="mb-2 p-2 bg-blue-50 rounded text-xs">
        <div className="font-medium text-blue-700">
          {videoProvider === 'kling' ? 'Using Kling 1.6' : 'Using Luma Dream Machine'}
        </div>
        <div className="text-blue-600 mt-1">
          {videoProvider === 'kling' 
            ? 'Good for character animations and stylized videos' 
            : 'Good for realistic videos with high visual quality'}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={videoProvider === 'kling' 
              ? "E.g., animated character dancing in a forest, 3D style" 
              : "E.g., person walking through a futuristic city with neon lights"}
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
          {loading ? 'Generating...' : `Generate with ${videoProvider === 'kling' ? 'Kling' : 'Luma AI'}`}
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