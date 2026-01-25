import React, { useMemo } from 'react';
import ReactFlow, { type Node, type Edge, Background, Controls, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { useFileSystem } from '../lib/VirtualFileSystem';
import { useVirtualDB } from '../lib/VirtualDB';
import { useSettings } from '../lib/SettingsContext';
import StorageNode from './nodes/StorageNode';
import ProcessNode from './nodes/ProcessNode';

const nodeTypes = {
  storage: StorageNode,
  process: ProcessNode,
};

interface PipelineFlowProps {
  activeSteps?: string[];
}

const PipelineFlow: React.FC<PipelineFlowProps> = ({ activeSteps = [] }) => {
  const { listFiles } = useFileSystem();
  const { select } = useVirtualDB();
  const { collection, delivery, etl } = useSettings();

  // Counts (Aggregated for Collection Jobs)
  const sourceCount = collection.jobs.reduce((acc, job) => {
    try {
       return acc + listFiles(job.sourcePath).length;
    } catch {
       return acc;
    }
  }, 0);

  const incomingCount = collection.jobs.reduce((acc, job) => {
    try {
       return acc + listFiles(job.targetPath).length;
    } catch {
       return acc;
    }
  }, 0);

  const internalCount = listFiles(delivery.targetPath).length;
  const rawCount = select(etl.rawTableName).length;
  const summaryCount = select(etl.summaryTableName).length;

  // Labels
  const sourceLabel = collection.jobs.length === 1 ? collection.jobs[0].sourcePath : `Sources (${collection.jobs.length})`;
  const targetLabel = collection.jobs.length === 1 ? collection.jobs[0].targetPath : `Incoming (${collection.jobs.length})`;

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
      data: { label: sourceLabel, type: 'fs', count: sourceCount }, // Default: Target Left, Source Right
    },
    // 2. FTP (Process)
    {
      id: '2',
      type: 'process',
      position: { x: startX + gapX, y: startY + 20 },
      data: { label: 'FTP Transfer', isProcessing: activeSteps.includes('transfer_1') },
    },
    // 3. Incoming (Store)
    {
      id: '3',
      type: 'storage',
      position: { x: startX + gapX * 2, y: startY },
      data: { label: targetLabel, type: 'fs', count: incomingCount },
    },
    // 4. Distribute (Process)
    {
      id: '4',
      type: 'process',
      position: { x: startX + gapX * 3, y: startY + 20 },
      data: { label: 'Distribute', isProcessing: activeSteps.includes('transfer_2') },
    },
    // 5. Internal (Store)
    {
      id: '5',
      type: 'storage',
      position: { x: startX + gapX * 4, y: startY },
      data: {
        label: delivery.targetPath,
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
        isProcessing: activeSteps.includes('process_etl'),
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
        label: etl.rawTableName,
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
        isProcessing: activeSteps.includes('process_transform'),
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
        label: etl.summaryTableName,
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
