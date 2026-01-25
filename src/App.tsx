import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  {
    id: '1',
    position: { x: 100, y: 100 },
    data: { label: 'File Source' },
    type: 'input',
  },
  {
    id: '2',
    position: { x: 100, y: 200 },
    data: { label: 'ETL Processor' },
  },
  {
    id: '3',
    position: { x: 100, y: 300 },
    data: { label: 'Target DB' },
    type: 'output',
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
];

function App() {
  return (
    <div className="h-screen w-screen bg-gray-50">
      <header className="absolute top-0 left-0 z-10 p-4 bg-white/80 backdrop-blur-sm border-b border-gray-200 w-full">
        <h1 className="text-xl font-bold text-gray-800">
          Data Pipeline Simulator
        </h1>
      </header>
      <ReactFlow nodes={initialNodes} edges={initialEdges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default App;
