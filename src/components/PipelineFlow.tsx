import React from 'react';
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
  const { dataSource, collection, delivery, etl } = useSettings();

  // Helper for safe counts
  const getCount = (path: string) => {
    try {
      return listFiles(path).length;
    } catch {
      return 0;
    }
  };

  const sourceCount = getCount(dataSource.sourcePath);
  const internalCount = getCount(delivery.targetPath);
  const rawCount = select(etl.rawTableName).length;
  const summaryCount = select(etl.summaryTableName).length;

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Layout Constants
  const startX = 50;
  const startY = 50;
  const gapX = 220;
  const jobRowHeight = 150;

  // 1. Single Source Node
  // Positioned vertically centered relative to all jobs
  const totalJobs = collection.jobs.length;
  // If no jobs, just assume 1 slot
  const effectiveJobs = totalJobs || 1;
  const totalHeight = effectiveJobs * jobRowHeight;
  const centerY = startY + (totalHeight / 2) - (jobRowHeight / 2);

  nodes.push({
    id: 'source',
    type: 'storage',
    position: { x: startX, y: centerY > startY ? centerY : startY },
    data: { label: dataSource.sourcePath, type: 'fs', count: sourceCount },
  });

  // 2. Job Nodes (Branching)
  if (totalJobs === 0) {
     // Optional: Show empty state or nothing?
     // We just skip adding job nodes.
  }

  collection.jobs.forEach((job, index) => {
    const jobY = startY + index * jobRowHeight;

    // FTP Process
    const ftpId = `ftp-${job.id}`;
    nodes.push({
      id: ftpId,
      type: 'process',
      position: { x: startX + gapX, y: jobY + 20 },
      data: { label: `FTP (${job.name})`, isProcessing: activeSteps.includes('transfer_1') },
    });

    // Target Storage
    const targetId = `target-${job.id}`;
    const targetCount = getCount(job.targetPath);
    nodes.push({
      id: targetId,
      type: 'storage',
      position: { x: startX + gapX * 2, y: jobY },
      data: { label: job.targetPath, type: 'fs', count: targetCount },
    });

    // Edge: Source -> FTP
    edges.push({
      id: `e-source-${ftpId}`,
      source: 'source',
      target: ftpId,
      animated: true,
      sourceHandle: 'right',
    });

    // Edge: FTP -> Target
    edges.push({
      id: `e-${ftpId}-${targetId}`,
      source: ftpId,
      target: targetId,
      animated: true,
    });
  });

  // 3. Delivery & Internal
  const distId = 'distribute';
  const internalId = 'internal';

  // Align roughly with center (or at least startY)
  const distY = (centerY > startY ? centerY : startY) + 20;

  nodes.push({
    id: distId,
    type: 'process',
    position: { x: startX + gapX * 3, y: distY },
    data: { label: 'Distribute', isProcessing: activeSteps.includes('transfer_2') },
  });

  nodes.push({
    id: internalId,
    type: 'storage',
    position: { x: startX + gapX * 4, y: distY - 20 },
    data: {
      label: delivery.targetPath,
      type: 'fs',
      count: internalCount,
      sourcePos: Position.Bottom
    },
  });

  edges.push({
    id: `e-${distId}-${internalId}`,
    source: distId,
    target: internalId,
    animated: true,
  });

  // Connect Matching Job Targets to Distribute
  collection.jobs.forEach(job => {
    if (job.targetPath === delivery.sourcePath) {
       edges.push({
         id: `e-target-${job.id}-${distId}`,
         source: `target-${job.id}`,
         target: distId,
         animated: true,
       });
    }
  });

  // 4. ETL Chain (Wrapping back Left)
  // Place below the lowest element so far.
  // Lowest job Y = startY + (totalJobs - 1) * jobRowHeight + ...
  const lowestJobY = startY + (Math.max(0, totalJobs - 1) * jobRowHeight);
  // Compare with distY logic
  const contentBottomY = Math.max(lowestJobY, distY);

  const etlY = contentBottomY + 180;

  // ETL Process
  nodes.push({
    id: 'etl',
    type: 'process',
    position: { x: startX + gapX * 4, y: etlY + 20 },
    data: {
      label: 'ETL & Load',
      isProcessing: activeSteps.includes('process_etl'),
      targetPos: Position.Top,
      sourcePos: Position.Left
    },
  });

  // Connect Internal -> ETL
  edges.push({
     id: 'e-internal-etl',
     source: internalId,
     target: 'etl',
     animated: true,
  });

  // Raw DB
  nodes.push({
    id: 'raw_db',
    type: 'storage',
    position: { x: startX + gapX * 3, y: etlY },
    data: {
      label: etl.rawTableName,
      type: 'db',
      count: rawCount,
      targetPos: Position.Right,
      sourcePos: Position.Left
    },
  });
  edges.push({ id: 'e-etl-raw', source: 'etl', target: 'raw_db', animated: true });

  // Transform
  nodes.push({
    id: 'transform',
    type: 'process',
    position: { x: startX + gapX * 2, y: etlY + 20 },
    data: {
      label: 'Transform',
      isProcessing: activeSteps.includes('process_transform'),
      targetPos: Position.Right,
      sourcePos: Position.Left
    },
  });
  edges.push({ id: 'e-raw-transform', source: 'raw_db', target: 'transform', animated: true });

  // Summary DB
  nodes.push({
    id: 'summary_db',
    type: 'storage',
    position: { x: startX + gapX, y: etlY },
    data: {
      label: etl.summaryTableName,
      type: 'db',
      count: summaryCount,
      targetPos: Position.Right
    },
  });
  edges.push({ id: 'e-transform-summary', source: 'transform', target: 'summary_db', animated: true });

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
