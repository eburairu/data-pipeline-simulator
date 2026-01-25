import React, { useMemo } from 'react';
import ReactFlow, { type Node, type Edge, Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';

const PipelineFlow: React.FC = () => {
  const nodes: Node[] = useMemo(() => [
    {
      id: '1',
      position: { x: 50, y: 50 },
      data: { label: 'Source (/source)' },
      style: { background: '#f3f4f6', color: '#1f2937', border: '1px solid #9ca3af', width: 150 },
    },
    {
      id: '2',
      position: { x: 250, y: 50 },
      data: { label: 'Collection (/incoming)' },
      style: { background: '#fef3c7', color: '#1f2937', border: '1px solid #d97706', width: 150 },
    },
    {
      id: '3',
      position: { x: 450, y: 50 },
      data: { label: 'Distribution (/internal)' },
      style: { background: '#ffedd5', color: '#1f2937', border: '1px solid #ea580c', width: 150 },
    },
    {
      id: '4',
      position: { x: 450, y: 200 },
      data: { label: 'ETL & Load' },
      style: { background: '#e0f2fe', color: '#1f2937', border: '1px solid #0284c7', width: 150 },
    },
    {
      id: '5',
      position: { x: 650, y: 200 },
      data: { label: 'Transform' },
      style: { background: '#dcfce7', color: '#1f2937', border: '1px solid #16a34a', width: 150 },
    },
  ], []);

  const edges: Edge[] = useMemo(() => [
    { id: 'e1-2', source: '1', target: '2', animated: true, label: 'FTP Transfer' },
    { id: 'e2-3', source: '2', target: '3', animated: true, label: 'Distribute' },
    { id: 'e3-4', source: '3', target: '4', animated: true, label: 'Load to DB' },
    { id: 'e4-5', source: '4', target: '5', animated: true, label: 'Aggregate' },
  ], []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default PipelineFlow;
