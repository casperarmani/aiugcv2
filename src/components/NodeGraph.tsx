import { useCallback, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  Node,
  Edge,
  addEdge,
  NodeTypes,
  Connection,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { DownloaderNode, DownloaderOutput } from './nodes/DownloaderNode';
import { FaceSwapNode, FaceSwapOutput } from './nodes/FaceSwapNode';
import { KlingNode, KlingOutput } from './nodes/KlingNode';
import { LipSyncNode } from './nodes/LipSyncNode';
import { ManualFrameSwapNode } from './nodes/ManualFrameSwapNode';

// Define custom node types
const nodeTypes: NodeTypes = {
  downloaderNode: DownloaderNode,
  faceSwapNode: FaceSwapNode,
  klingNode: KlingNode,
  lipSyncNode: LipSyncNode,
  manualFrameSwapNode: ManualFrameSwapNode,
};

// Initial nodes
const initialNodes: Node[] = [
  {
    id: 'downloader',
    type: 'downloaderNode',
    position: { x: 0, y: 0 },
    data: { onSuccess: () => {} }, // Will be overwritten
  },
  {
    id: 'faceSwap',
    type: 'faceSwapNode',
    position: { x: 350, y: 0 },
    data: { onSuccess: () => {} }, // Will be overwritten
  },
  {
    id: 'kling',
    type: 'klingNode',
    position: { x: 700, y: 0 },
    data: { onSuccess: () => {} }, // Will be overwritten
  },
  {
    id: 'lipSync',
    type: 'lipSyncNode',
    position: { x: 2000, y: 800 }, // Moved extremely far away from main flow
    data: { onSuccess: () => {} }, // Will be overwritten
  },
  {
    id: 'manualFrameSwap',
    type: 'manualFrameSwapNode',
    position: { x: 0, y: 400 }, // Positioned far below the main flow
    data: { onSuccess: () => {} }, // Will be overwritten
  },
];

// Initial edges
const initialEdges: Edge[] = [
  {
    id: 'downloader-to-faceswap',
    source: 'downloader',
    target: 'faceSwap',
    animated: true,
  },
  {
    id: 'faceswap-to-kling',
    source: 'faceSwap',
    target: 'kling',
    animated: true,
  },
];

export default function NodeGraph() {
  // State for nodes and edges
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  
  // State for node data
  const [downloaderOutput, setDownloaderOutput] = useState<DownloaderOutput | undefined>();
  const [faceSwapOutput, setFaceSwapOutput] = useState<FaceSwapOutput | undefined>();
  const [klingOutput, setKlingOutput] = useState<KlingOutput | undefined>();
  
  // Handle edge connections
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );
  
  // Initialize node data and callbacks
  const onNodesInit = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === 'downloader') {
          return {
            ...node,
            data: {
              ...node.data,
              onSuccess: (output: DownloaderOutput) => {
                setDownloaderOutput(output);
                setNodes((prevNodes) =>
                  prevNodes.map((n) =>
                    n.id === 'faceSwap'
                      ? { ...n, data: { ...n.data, inputData: output } }
                      : n
                  )
                );
              },
            },
          };
        } else if (node.id === 'faceSwap') {
          return {
            ...node,
            data: {
              ...node.data,
              inputData: downloaderOutput,
              onSuccess: (output: FaceSwapOutput) => {
                setFaceSwapOutput(output);
                setNodes((prevNodes) =>
                  prevNodes.map((n) =>
                    n.id === 'kling'
                      ? { ...n, data: { ...n.data, inputData: output } }
                      : n
                  )
                );
              },
            },
          };
        } else if (node.id === 'kling') {
          return {
            ...node,
            data: {
              ...node.data,
              inputData: faceSwapOutput,
              onSuccess: (output: KlingOutput) => {
                setKlingOutput(output);
              },
            },
          };
        } else if (node.id === 'lipSync') {
          return {
            ...node,
            data: {
              ...node.data,
              onSuccess: () => {},
            },
          };
        } else if (node.id === 'manualFrameSwap') {
          return {
            ...node,
            data: {
              ...node.data,
              onSuccess: () => {},
            },
          };
        }
        return node;
      })
    );
  }, [downloaderOutput, faceSwapOutput]);
  
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 100px)' }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={() => {}}
          onEdgesChange={() => {}}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onInit={onNodesInit}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}