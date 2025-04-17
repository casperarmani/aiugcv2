"use client";

import dynamic from 'next/dynamic';

// Dynamically import NodeGraph with SSR disabled to handle browser-specific APIs
const NodeGraph = dynamic(() => import('@/components/NodeGraph'), {
  ssr: false,
});

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="p-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold">TikTok Video Processing Workflow</h1>
        <p className="text-gray-600">
          Process TikTok videos with face swapping, video generation, and lip syncing
        </p>
      </header>
      
      <main className="p-4">
        <NodeGraph />
      </main>
    </div>
  );
}