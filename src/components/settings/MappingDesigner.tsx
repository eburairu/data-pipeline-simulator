import React, { useState, useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    type Node,
    type Edge,
    Handle,
    Position,
    useNodesState,
    useEdgesState,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { useSettings } from '../../lib/SettingsContext';
import {
    type Mapping,
    type Transformation,
    type TransformationType,
    type SourceConfig,
    type TargetConfig,
    type FilterConfig,
    type ExpressionConfig,
    type AggregatorConfig
} from '../../lib/MappingTypes';
import { Trash2, Plus, Save, X, Edit3, PlayCircle } from 'lucide-react';

// --- Custom Nodes for Designer ---
const DesignerNode = ({ data }: { data: { label: string, type: string, isSelected: boolean } }) => {
    const style = data.isSelected ? { border: '2px solid #2563eb' } : {};
    return (
        <div className={`px-4 py-2 shadow-md rounded-md bg-white border border-gray-200 text-xs w-32 flex flex-col items-center justify-center`} style={style}>
             <Handle type="target" position={Position.Left} className="w-2 h-2" />
             <div className="font-bold text-center">{data.label}</div>
             <div className="text-[10px] text-gray-500 uppercase">{data.type}</div>
             <Handle type="source" position={Position.Right} className="w-2 h-2" />
        </div>
    );
};

const nodeTypes = {
    designer: DesignerNode
};

// --- Layout Helper ---
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const nodeWidth = 150;
    const nodeHeight = 50;

    dagreGraph.setGraph({ rankdir: 'LR' });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = Position.Left;
        node.sourcePosition = Position.Right;
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };
    });

    return { nodes, edges };
};


const MappingDesigner: React.FC = () => {
    const { mappings, addMapping, updateMapping, removeMapping, connections } = useSettings();
    const [editingMapping, setEditingMapping] = useState<Mapping | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    const handleCreate = () => {
        const newMapping: Mapping = {
            id: `map_${Date.now()}`,
            name: 'New Mapping',
            transformations: [],
            links: []
        };
        addMapping(newMapping);
        setEditingMapping(newMapping);
        setSelectedNodeId(null);
    };

    const handleEdit = (m: Mapping) => {
        setEditingMapping({ ...m }); // Clone to avoid direct mutation
        setSelectedNodeId(null);
    };

    const handleSave = () => {
        if (editingMapping) {
            updateMapping(editingMapping.id, editingMapping);
            setEditingMapping(null);
        }
    };

    const handleDelete = (id: string) => {
        removeMapping(id);
        if (editingMapping?.id === id) setEditingMapping(null);
    };

    // --- Node Operations ---
    const addTransformation = (type: TransformationType) => {
        if (!editingMapping) return;

        const id = `t_${Date.now()}`;
        const newTrans: Transformation = {
            id,
            type,
            name: `${type}_${editingMapping.transformations.length + 1}`,
            position: { x: 0, y: 0 },
            config: {} as any // Config initialized empty
        };

        // Initialize default config based on type
        if (type === 'source') newTrans.config = { connectionId: '' } as SourceConfig;
        if (type === 'target') newTrans.config = { connectionId: '' } as TargetConfig;
        if (type === 'filter') newTrans.config = { condition: 'true' } as FilterConfig;
        if (type === 'expression') newTrans.config = { fields: [] } as ExpressionConfig;
        if (type === 'aggregator') newTrans.config = { groupBy: [], aggregates: [] } as AggregatorConfig;

        // Auto-link if a node is selected
        let newLinks = [...editingMapping.links];
        if (selectedNodeId) {
            newLinks.push({
                id: `l_${Date.now()}`,
                sourceId: selectedNodeId,
                targetId: id
            });
        }

        setEditingMapping({
            ...editingMapping,
            transformations: [...editingMapping.transformations, newTrans],
            links: newLinks
        });
        setSelectedNodeId(id);
    };

    const removeTransformation = (id: string) => {
        if (!editingMapping) return;
        setEditingMapping({
            ...editingMapping,
            transformations: editingMapping.transformations.filter(t => t.id !== id),
            links: editingMapping.links.filter(l => l.sourceId !== id && l.targetId !== id)
        });
        if (selectedNodeId === id) setSelectedNodeId(null);
    };

    const updateTransformationConfig = (id: string, config: any) => {
        if (!editingMapping) return;
        setEditingMapping({
            ...editingMapping,
            transformations: editingMapping.transformations.map(t =>
                t.id === id ? { ...t, config: { ...t.config, ...config } } : t
            )
        });
    };

    const handleNodeClick = (_: any, node: Node) => {
        setSelectedNodeId(node.id);
    };

    // React Flow Nodes/Edges generation
    const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
        if (!editingMapping) return { nodes: [], edges: [] };

        const nodes: Node[] = editingMapping.transformations.map(t => ({
            id: t.id,
            type: 'designer',
            position: t.position || { x: 0, y: 0 },
            data: { label: t.name, type: t.type, isSelected: selectedNodeId === t.id }
        }));

        const edges: Edge[] = editingMapping.links.map(l => ({
            id: l.id,
            source: l.sourceId,
            target: l.targetId,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed }
        }));

        return getLayoutedElements(nodes, edges);
    }, [editingMapping, selectedNodeId]);


    // --- Render Config Panel ---
    const renderConfigPanel = () => {
        if (!selectedNodeId || !editingMapping) return <div className="p-4 text-gray-400 text-sm">Select a transformation to edit properties.</div>;

        const node = editingMapping.transformations.find(t => t.id === selectedNodeId);
        if (!node) return null;

        return (
            <div className="p-4 space-y-4">
                <div className="font-bold text-sm border-b pb-2 mb-2 flex justify-between items-center">
                    {node.type.toUpperCase()} Properties
                    <button onClick={() => removeTransformation(node.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={16} />
                    </button>
                </div>

                <div>
                    <label className="block text-xs text-gray-500">Name</label>
                    <input
                        className="w-full border rounded p-1 text-sm"
                        value={node.name}
                        onChange={e => {
                            const newName = e.target.value;
                            setEditingMapping(prev => prev ? ({
                                ...prev,
                                transformations: prev.transformations.map(t => t.id === node.id ? { ...t, name: newName } : t)
                            }) : null)
                        }}
                    />
                </div>

                {node.type === 'source' && (
                    <div>
                        <label className="block text-xs text-gray-500">Connection</label>
                        <select
                            className="w-full border rounded p-1 text-sm"
                            value={(node.config as SourceConfig).connectionId}
                            onChange={e => updateTransformationConfig(node.id, { connectionId: e.target.value })}
                        >
                            <option value="">Select Connection</option>
                            {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                )}

                {node.type === 'target' && (
                    <div>
                        <label className="block text-xs text-gray-500">Connection</label>
                        <select
                            className="w-full border rounded p-1 text-sm"
                            value={(node.config as TargetConfig).connectionId}
                            onChange={e => updateTransformationConfig(node.id, { connectionId: e.target.value })}
                        >
                            <option value="">Select Connection</option>
                            {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                )}

                {node.type === 'filter' && (
                    <div>
                        <label className="block text-xs text-gray-500">Filter Condition (JS Expression)</label>
                        <input
                            className="w-full border rounded p-1 text-sm"
                            placeholder="e.g. amount > 100"
                            value={(node.config as FilterConfig).condition}
                            onChange={e => updateTransformationConfig(node.id, { condition: e.target.value })}
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Available vars: field names (e.g. price)</p>
                    </div>
                )}

                 {/* Simplified Expression/Aggregator editors can be added here */}
                 {node.type === 'expression' && (
                     <div className="text-xs text-gray-500 italic">
                         Expression editor not fully implemented in this summary view.
                         <br/>
                         (Manual JSON edit or simplified view could go here)
                     </div>
                 )}
            </div>
        );
    };

    if (editingMapping) {
        return (
            <div className="h-[600px] flex flex-col border rounded bg-white shadow-sm">
                <div className="p-2 border-b flex justify-between items-center bg-gray-50">
                    <input
                        className="font-bold bg-transparent border-none focus:ring-0 text-sm"
                        value={editingMapping.name}
                        onChange={e => setEditingMapping({...editingMapping, name: e.target.value})}
                    />
                    <div className="flex gap-2">
                        <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                            <Save size={14} /> Save
                        </button>
                        <button onClick={() => setEditingMapping(null)} className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300">
                            <X size={14} /> Cancel
                        </button>
                    </div>
                </div>

                <div className="flex-grow flex overflow-hidden">
                    {/* Toolbar */}
                    <div className="w-12 bg-gray-100 border-r flex flex-col items-center py-4 gap-4">
                        <button title="Add Source" onClick={() => addTransformation('source')} className="p-1 rounded hover:bg-gray-200"><div className="w-8 h-8 bg-green-100 border-green-500 border rounded flex items-center justify-center text-[10px]">SRC</div></button>
                        <button title="Add Filter" onClick={() => addTransformation('filter')} className="p-1 rounded hover:bg-gray-200"><div className="w-8 h-8 bg-yellow-100 border-yellow-500 border rounded flex items-center justify-center text-[10px]">FLT</div></button>
                        <button title="Add Expression" onClick={() => addTransformation('expression')} className="p-1 rounded hover:bg-gray-200"><div className="w-8 h-8 bg-purple-100 border-purple-500 border rounded flex items-center justify-center text-[10px]">EXP</div></button>
                        <button title="Add Aggregator" onClick={() => addTransformation('aggregator')} className="p-1 rounded hover:bg-gray-200"><div className="w-8 h-8 bg-orange-100 border-orange-500 border rounded flex items-center justify-center text-[10px]">AGG</div></button>
                        <button title="Add Target" onClick={() => addTransformation('target')} className="p-1 rounded hover:bg-gray-200"><div className="w-8 h-8 bg-red-100 border-red-500 border rounded flex items-center justify-center text-[10px]">TGT</div></button>
                    </div>

                    {/* Canvas */}
                    <div className="flex-grow relative bg-gray-50">
                        <ReactFlow
                            nodes={layoutedNodes}
                            edges={layoutedEdges}
                            nodeTypes={nodeTypes}
                            onNodeClick={handleNodeClick}
                            fitView
                        >
                            <Background color="#aaa" gap={16} />
                            <Controls />
                        </ReactFlow>
                    </div>

                    {/* Properties */}
                    <div className="w-64 border-l bg-white overflow-y-auto">
                        {renderConfigPanel()}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4 border rounded bg-white shadow-sm">
             <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
                <Edit3 className="w-5 h-5" /> Mappings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mappings.map(m => (
                    <div key={m.id} className="border p-4 rounded bg-gray-50 hover:shadow-md transition-shadow relative">
                        <h4 className="font-bold text-gray-700">{m.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{m.transformations.length} transformations</p>
                        <div className="mt-4 flex gap-2">
                            <button onClick={() => handleEdit(m)} className="text-blue-600 text-xs hover:underline flex items-center gap-1">
                                <Edit3 size={12} /> Edit
                            </button>
                            <button onClick={() => handleDelete(m.id)} className="text-red-600 text-xs hover:underline flex items-center gap-1">
                                <Trash2 size={12} /> Delete
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    onClick={handleCreate}
                    className="border-2 border-dashed border-gray-300 rounded p-4 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors h-full min-h-[100px]"
                >
                    <Plus size={24} />
                    <span className="text-sm font-medium">Create New Mapping</span>
                </button>
            </div>
        </div>
    );
};

export default MappingDesigner;
