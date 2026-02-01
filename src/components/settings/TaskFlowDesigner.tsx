import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Panel,
    type Node,
    type Edge,
    type Connection,
    Handle,
    Position,
    MarkerType,
    type ReactFlowInstance,
    useNodesState,
    useEdgesState,
    type NodeChange,
    type EdgeChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { useSettings } from '../../lib/SettingsContext';
import { type TaskFlow, type MappingTask } from '../../lib/MappingTypes';
import { Trash2, Plus, Save, X, GitBranch, LayoutGrid, PlayCircle, Settings, Clock, Zap } from 'lucide-react';

// --- Custom Nodes ---
const TaskNode = ({ data }: { data: { label: string, isSelected: boolean, enabled: boolean } }) => {
    const style = data.isSelected ? { border: '2px solid #2563eb' } : {};
    return (
        <div className={`px-4 py-3 shadow-md rounded-md bg-white border ${data.enabled ? 'border-gray-300' : 'border-gray-200 opacity-60'} text-xs w-40 flex flex-col relative`} style={style}>
            <Handle type="target" position={Position.Top} className="w-2 h-2" />
            <div className="flex items-center gap-2 mb-1">
                <PlayCircle size={14} className={data.enabled ? 'text-blue-500' : 'text-gray-400'} />
                <div className="font-bold truncate flex-grow">{data.label}</div>
            </div>
            <div className="text-[10px] text-gray-400 font-mono">TASK</div>
            <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
        </div>
    );
};

const nodeTypes = {
    task: TaskNode
};

// --- Layout Helper ---
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB' }); // Top to Bottom for workflow

    const nodeWidth = 160;
    const nodeHeight = 60;

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = Position.Top;
        node.sourcePosition = Position.Bottom;
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };
    });

    return { nodes, edges };
};

const TaskFlowDesigner: React.FC = () => {
    const { taskFlows, addTaskFlow, updateTaskFlow, removeTaskFlow, mappingTasks, updateMappingTask } = useSettings();
    const [editingFlow, setEditingFlow] = useState<TaskFlow | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
    const [hasAutoAligned, setHasAutoAligned] = useState(false);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const handleCreate = () => {
        const newFlow: TaskFlow = {
            id: `tf_${Date.now()}`,
            name: 'New Task Flow',
            taskIds: [],
            executionInterval: 10000,
            enabled: true,
            parallelExecution: false,
            layoutNodes: [],
            layoutLinks: []
        };
        addTaskFlow(newFlow);
        setEditingFlow(newFlow);
    };

    const handleEdit = (flow: TaskFlow) => {
        setEditingFlow(JSON.parse(JSON.stringify(flow)));
    };

    const handleSave = () => {
        if (editingFlow) {
            updateTaskFlow(editingFlow.id, editingFlow);
            setEditingFlow(null);
        }
    };

    const handleDelete = (id: string) => {
        removeTaskFlow(id);
        if (editingFlow?.id === id) setEditingFlow(null);
    };

    const toggleTaskInFlow = (taskId: string) => {
        if (!editingFlow) return;
        const taskIds = editingFlow.taskIds.includes(taskId)
            ? editingFlow.taskIds.filter(id => id !== taskId)
            : [...editingFlow.taskIds, taskId];
        
        setEditingFlow({ ...editingFlow, taskIds });
    };

    useEffect(() => {
        if (!editingFlow) {
            setNodes([]);
            setEdges([]);
            return;
        }

        // Create nodes for all tasks in the flow
        const flowNodes: Node[] = editingFlow.taskIds.map(taskId => {
            const task = mappingTasks.find(t => t.id === taskId);
            const layout = editingFlow.layoutNodes?.find(l => l.id === taskId);
            return {
                id: taskId,
                type: 'task',
                position: layout?.position || { x: 0, y: 0 },
                data: {
                    label: task?.name || taskId,
                    isSelected: selectedNodeId === taskId,
                    enabled: task?.enabled ?? true
                }
            };
        });

        // Create edges from mapping task dependencies
        const flowEdges: Edge[] = [];
        editingFlow.taskIds.forEach(taskId => {
            const task = mappingTasks.find(t => t.id === taskId);
            if (task?.dependencies) {
                task.dependencies.forEach(depId => {
                    if (editingFlow.taskIds.includes(depId)) {
                        flowEdges.push({
                            id: `e_${depId}_${taskId}`,
                            source: depId,
                            target: taskId,
                            markerEnd: { type: MarkerType.ArrowClosed },
                            style: { strokeWidth: 2 }
                        });
                    }
                });
            }
        });

        setNodes(flowNodes);
        setEdges(flowEdges);
    }, [editingFlow?.id, editingFlow?.taskIds, mappingTasks, selectedNodeId]);

    const onConnect = useCallback((params: Connection) => {
        if (!params.source || !params.target || !editingFlow) return;
        
        const targetTask = mappingTasks.find(t => t.id === params.target);
        if (targetTask) {
            const currentDeps = targetTask.dependencies || [];
            if (!currentDeps.includes(params.source)) {
                updateMappingTask(targetTask.id, {
                    dependencies: [...currentDeps, params.source]
                });
            }
        }
    }, [editingFlow, mappingTasks, updateMappingTask]);

    const handleNodesChange = useCallback((changes: NodeChange[]) => {
        onNodesChange(changes);
        changes.forEach(change => {
            if (change.type === 'position' && change.dragging === false && change.position && editingFlow) {
                setEditingFlow(prev => {
                    if (!prev) return null;
                    const existing = prev.layoutNodes || [];
                    const others = existing.filter(l => l.id !== change.id);
                    return {
                        ...prev,
                        layoutNodes: [...others, { id: change.id, position: change.position! }]
                    };
                });
            }
        });
    }, [onNodesChange, editingFlow]);

    const onLayout = useCallback(() => {
        if (!editingFlow || nodes.length === 0) return;
        const { nodes: layouted } = getLayoutedElements([...nodes], [...edges]);
        setNodes(layouted);
        
        // Update editingFlow layout
        const newLayout = layouted.map(n => ({ id: n.id, position: n.position }));
        setEditingFlow({ ...editingFlow, layoutNodes: newLayout });

        if (rfInstance) {
            rfInstance.fitView({ padding: 0.2, duration: 500 });
        }
    }, [editingFlow, nodes, edges, setNodes, rfInstance]);

    const renderProperties = () => {
        if (!editingFlow) return null;
        
        return (
            <div className="p-4 space-y-6">
                <div className="border-b pb-4">
                    <h4 className="text-sm font-bold flex items-center gap-2 mb-4 text-gray-700">
                        <Settings size={16} /> Flow Settings
                    </h4>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Flow Name</label>
                            <input
                                className="w-full border rounded p-1.5 text-sm"
                                value={editingFlow.name}
                                onChange={e => setEditingFlow({ ...editingFlow, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                                <Clock size={12} /> Interval (ms)
                            </label>
                            <input
                                type="number"
                                className="w-full border rounded p-1.5 text-sm"
                                value={editingFlow.executionInterval}
                                onChange={e => setEditingFlow({ ...editingFlow, executionInterval: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex gap-4 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editingFlow.enabled}
                                    onChange={e => setEditingFlow({ ...editingFlow, enabled: e.target.checked })}
                                    className="rounded border-gray-300 text-blue-600"
                                />
                                <span className="text-sm text-gray-700">Enabled</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editingFlow.parallelExecution}
                                    onChange={e => setEditingFlow({ ...editingFlow, parallelExecution: e.target.checked })}
                                    className="rounded border-gray-300 text-blue-600"
                                />
                                <span className="text-sm text-gray-700 flex items-center gap-1">
                                    <Zap size={12} className="text-yellow-500" /> Parallel
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="text-sm font-bold flex items-center gap-2 mb-3 text-gray-700">
                        <Plus size={16} /> Add Tasks to Flow
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {mappingTasks.map(task => (
                            <div 
                                key={task.id} 
                                onClick={() => toggleTaskInFlow(task.id)}
                                className={`p-2 rounded border text-xs cursor-pointer transition-colors ${
                                    editingFlow.taskIds.includes(task.id) 
                                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <div className="font-bold truncate">{task.name}</div>
                                <div className="text-[9px] opacity-70">ID: {task.id}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    if (editingFlow) {
        return (
            <div className="h-[600px] flex flex-col border rounded bg-white shadow-sm mt-4">
                <div className="p-3 border-b flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-2">
                        <GitBranch size={18} className="text-blue-600" />
                        <span className="font-bold text-gray-800">Flow Designer: {editingFlow.name}</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleSave} className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 shadow-sm transition-colors">
                            <Save size={14} /> Save Flow
                        </button>
                        <button onClick={() => setEditingFlow(null)} className="flex items-center gap-1 px-4 py-1.5 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 transition-colors">
                            <X size={14} /> Cancel
                        </button>
                    </div>
                </div>

                <div className="flex-grow flex flex-col md:flex-row overflow-hidden relative">
                    <div className="flex-grow relative bg-gray-50">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            nodeTypes={nodeTypes}
                            onNodesChange={handleNodesChange}
                            onEdgesChange={onEdgesChange}
                            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                            onConnect={onConnect}
                            onInit={setRfInstance}
                            fitView
                        >
                            <Background color="#aaa" gap={16} />
                            <Controls />
                            <Panel position="top-right">
                                <button
                                    onClick={onLayout}
                                    className="flex items-center gap-2 bg-white px-3 py-2 rounded shadow border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700"
                                >
                                    <LayoutGrid size={16} /> Align Flow
                                </button>
                            </Panel>
                        </ReactFlow>
                    </div>
                    <div className="w-full md:w-72 bg-white border-l overflow-y-auto shadow-inner">
                        {renderProperties()}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4 border rounded bg-white shadow-sm mt-6">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
                <GitBranch className="w-5 h-5" /> Task Flows
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {taskFlows.map(flow => (
                    <div key={flow.id} className="border p-4 rounded bg-gray-50 hover:shadow-md transition-all relative group">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-gray-700">{flow.name}</h4>
                            <div className={`w-2 h-2 rounded-full ${flow.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                        </div>
                        <p className="text-xs text-gray-500">{flow.taskIds.length} tasks linked</p>
                        <div className="mt-4 flex gap-3">
                            <button onClick={() => handleEdit(flow)} className="text-blue-600 text-xs hover:underline flex items-center gap-1 font-medium">
                                <Settings size={12} /> Configure
                            </button>
                            <button onClick={() => handleDelete(flow.id)} className="text-red-600 text-xs hover:underline flex items-center gap-1 font-medium">
                                <Trash2 size={12} /> Delete
                            </button>
                        </div>
                    </div>
                ))}
                <button
                    onClick={handleCreate}
                    className="border-2 border-dashed border-gray-300 rounded p-6 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all h-full min-h-[120px]"
                >
                    <Plus size={32} />
                    <span className="text-sm font-bold mt-2">Create New Flow</span>
                </button>
            </div>
        </div>
    );
};

export default TaskFlowDesigner;
