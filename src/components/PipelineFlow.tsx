import React, { useMemo } from 'react';
import ReactFlow, { type Node, type Edge, Background, Controls, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { useFileSystem } from '../lib/VirtualFileSystem';
import { useVirtualDB } from '../lib/VirtualDB';
import StorageNode from './nodes/StorageNode';
import ProcessNode from './nodes/ProcessNode';

const nodeTypes = {
  storage: StorageNode,
  process: ProcessNode,
};

interface PipelineFlowProps {
  activeStep?: string;
}

const PipelineFlow: React.FC<PipelineFlowProps> = ({ activeStep = '' }) => {
  const { listFiles } = useFileSystem();
  const { select } = useVirtualDB();

  // Counts
  const sourceCount = listFiles('/source').length;
  const incomingCount = listFiles('/incoming').length;
  const internalCount = listFiles('/internal').length;
  const rawCount = select('raw_data').length;
  const summaryCount = select('summary_data').length;

  // Layout Constants
  const startX = 50;
  const startY = 50;
  const gapX = 220;
  const rowH = 180;

  const nodes: Node[] = [
    // Row 1: Left to Right
    // 1. Source (Store)
    {
      id: '1',
      type: 'storage',
      position: { x: startX, y: startY },
      data: { label: '/source', type: 'fs', count: sourceCount }, // Default: Target Left, Source Right
    },
    // 2. FTP (Process)
    {
      id: '2',
      type: 'process',
      position: { x: startX + gapX, y: startY + 20 },
      data: { label: 'FTP Transfer', isProcessing: activeStep === 'transfer_1' },
    },
    // 3. Incoming (Store)
    {
      id: '3',
      type: 'storage',
      position: { x: startX + gapX * 2, y: startY },
      data: { label: '/incoming', type: 'fs', count: incomingCount },
    },
    // 4. Distribute (Process)
    {
      id: '4',
      type: 'process',
      position: { x: startX + gapX * 3, y: startY + 20 },
      data: { label: 'Distribute', isProcessing: activeStep === 'transfer_2' },
    },
    // 5. Internal (Store)
    {
      id: '5',
      type: 'storage',
      position: { x: startX + gapX * 4, y: startY },
      data: {
        label: '/internal',
        type: 'fs',
        count: internalCount,
        sourcePos: Position.Bottom // Turn downwards
      },
    },

    // Row 2: Right to Left
    // 6. ETL (Process) - Directly below 5
    {
      id: '6',
      type: 'process',
      position: { x: startX + gapX * 4, y: startY + rowH + 20 },
      data: {
        label: 'ETL & Load',
        isProcessing: activeStep === 'process_etl',
        targetPos: Position.Top, // Receive from above
        sourcePos: Position.Left // Send left
      },
    },
    // 7. Raw DB (Store)
    {
      id: '7',
      type: 'storage',
      position: { x: startX + gapX * 3, y: startY + rowH },
      data: {
        label: 'raw_data',
        type: 'db',
        count: rawCount,
        targetPos: Position.Right, // Receive from right
        sourcePos: Position.Left // Send left
      },
    },
    // 8. Transform (Process)
    {
      id: '8',
      type: 'process',
      position: { x: startX + gapX * 2, y: startY + rowH + 20 },
      data: {
        label: 'Transform',
        isProcessing: activeStep === 'process_transform',
        targetPos: Position.Right,
        sourcePos: Position.Left
      },
    },
    // 9. Summary DB (Store)
    {
      id: '9',
      type: 'storage',
      position: { x: startX + gapX, y: startY + rowH },
      data: {
        label: 'summary_data',
        type: 'db',
        count: summaryCount,
        targetPos: Position.Right
      },
    },
  ];

  const edges: Edge[] = useMemo(() => [
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e2-3', source: '2', target: '3', animated: true },
    { id: 'e3-4', source: '3', target: '4', animated: true },
    { id: 'e4-5', source: '4', target: '5', animated: true },
    { id: 'e5-6', source: '5', target: '6', animated: true },
    { id: 'e6-7', source: '6', target: '7', animated: true },
    { id: 'e7-8', source: '7', target: '8', animated: true },
    { id: 'e8-9', source: '8', target: '9', animated: true },
  ], []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default PipelineFlow;
