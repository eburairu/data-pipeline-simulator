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
import { Trash2, Plus, Save, X, Edit3, LayoutGrid } from 'lucide-react';

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
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
    const [hasAutoAligned, setHasAutoAligned] = useState(false);

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

    const onConnect = useCallback(
        (params: Connection) => {
            if (!editingMapping || !params.source || !params.target) return;

            // Prevent duplicates
            const linkExists = editingMapping.links.some(
                (l) => l.sourceId === params.source && l.targetId === params.target
            );
            if (linkExists) return;

            // Prevent self-loops if needed (though ReactFlow handles basic self-loops, logical validation is good)
            if (params.source === params.target) return;

            const newLink = {
                id: `l_${Date.now()}`,
                sourceId: params.source,
                targetId: params.target,
            };

            setEditingMapping((prev) =>
                prev
                    ? {
                        ...prev,
                        links: [...prev.links, newLink],
                    }
                    : null
            );
        },
        [editingMapping]
    );

    // React Flow Nodes/Edges state
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

    // Track structural changes only (not position changes)
    const transformationIds = editingMapping?.transformations.map(t => t.id).join(',') || '';
    const transformationNames = editingMapping?.transformations.map(t => t.name).join(',') || '';
    const linkIds = editingMapping?.links.map(l => l.id).join(',') || '';

    // Sync nodes/edges from editingMapping only on structural changes
    useEffect(() => {
        if (!editingMapping) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const newNodes: Node[] = editingMapping.transformations.map(t => ({
            id: t.id,
            type: 'designer',
            position: t.position || { x: 0, y: 0 },
            data: { label: t.name, type: t.type, isSelected: selectedNodeId === t.id },
            draggable: true
        }));

        const newEdges: Edge[] = editingMapping.links.map(l => ({
            id: l.id,
            source: l.sourceId,
            target: l.targetId,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: selectedEdgeId === l.id ? { stroke: '#ef4444', strokeWidth: 3 } : undefined
        }));

        const { nodes: layouted } = getLayoutedElements([...newNodes], [...newEdges]);

        // Preserve existing positions if nodes already exist
        setNodes(prevNodes => {
            const prevMap = new Map(prevNodes.map(n => [n.id, n]));
            return layouted.map(n => {
                const prev = prevMap.get(n.id);
                if (prev) {
                    return { ...n, position: prev.position, data: { ...n.data, isSelected: selectedNodeId === n.id } };
                }
                return n;
            });
        });
        setEdges(newEdges);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transformationIds, transformationNames, linkIds, selectedNodeId, selectedEdgeId, setNodes, setEdges]);

    // Handle node position changes (drag) - only update on drag end
    const handleNodesChange = useCallback((changes: NodeChange[]) => {
        onNodesChange(changes);

        // Only update editingMapping when drag ends
        changes.forEach(change => {
            if (change.type === 'position' && change.dragging === false && change.position) {
                setEditingMapping(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        transformations: prev.transformations.map(t =>
                            t.id === change.id ? { ...t, position: change.position! } : t
                        )
                    };
                });
            }
        });
    }, [onNodesChange]);

    // Handle edge deletion via keyboard
    const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
        changes.forEach(change => {
            if (change.type === 'remove') {
                setEditingMapping(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        links: prev.links.filter(l => l.id !== change.id)
                    };
                });
            }
        });
        onEdgesChange(changes);
    }, [onEdgesChange]);

    // Handle edge click to select (highlight for deletion)
    const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
        setSelectedEdgeId(prev => prev === edge.id ? null : edge.id);
    }, []);

    // Delete selected edge with button
    const deleteSelectedEdge = useCallback(() => {
        if (!selectedEdgeId || !editingMapping) return;
        setEditingMapping(prev => {
            if (!prev) return null;
            return {
                ...prev,
                links: prev.links.filter(l => l.id !== selectedEdgeId)
            };
        });
        setSelectedEdgeId(null);
    }, [selectedEdgeId, editingMapping]);

    // Auto-align on first load
    useEffect(() => {
        if (rfInstance && nodes.length > 0 && !hasAutoAligned) {
            setHasAutoAligned(true);
            window.requestAnimationFrame(() => {
                rfInstance.fitView({ padding: 0.2, duration: 500 });
            });
        }
    }, [rfInstance, nodes, hasAutoAligned]);

    // Reset auto-align flag when editing a different mapping
    useEffect(() => {
        setHasAutoAligned(false);
    }, [editingMapping?.id]);

    const onLayout = useCallback(() => {
        if (!editingMapping || nodes.length === 0) return;

        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));
        dagreGraph.setGraph({ rankdir: 'LR' });

        const nodeWidth = 150;
        const nodeHeight = 50;

        nodes.forEach((node) => {
            dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
        });

        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target);
        });

        dagre.layout(dagreGraph);

        const layoutedNodes = nodes.map((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            return {
                ...node,
                position: {
                    x: nodeWithPosition.x - nodeWidth / 2,
                    y: nodeWithPosition.y - nodeHeight / 2,
                },
            };
        });

        setNodes(layoutedNodes);

        if (rfInstance) {
            window.requestAnimationFrame(() => {
                rfInstance.fitView({ padding: 0.2, duration: 500 });
            });
        }
    }, [editingMapping, nodes, edges, setNodes, rfInstance]);


    // --- Render Config Panel ---
    const renderConfigPanel = () => {
        if (!selectedNodeId || !editingMapping) return <div className="p-4 text-gray-400 text-sm">Select a transformation to edit properties.</div>;

        const node = editingMapping.transformations.find(t => t.id === selectedNodeId);
        if (!node) return null;

        return (
            <div className="p-4 space-y-4">
                <div className="font-bold text-sm border-b pb-2 mb-2 flex justify-between items-center">
                    {node.type.toUpperCase()} Properties
                    <div className="flex items-center gap-2">
                        <button onClick={() => removeTransformation(node.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 size={16} />
                        </button>
                        <button onClick={() => setSelectedNodeId(null)} className="md:hidden text-gray-500 hover:text-gray-700">
                            <X size={16} />
                        </button>
                    </div>
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
                    <div className="space-y-3">
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
                        <div>
                            <label className="block text-xs text-gray-500">Filename Column (optional)</label>
                            <input
                                className="w-full border rounded p-1 text-sm"
                                placeholder="e.g. source_filename"
                                value={(node.config as SourceConfig).filenameColumn || ''}
                                onChange={e => updateTransformationConfig(node.id, { filenameColumn: e.target.value })}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">
                                If set, adds the source filename as a column (like IDMC CDI)
                            </p>
                        </div>
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

                {/* Expression Editor */}
                {node.type === 'expression' && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="block text-xs text-gray-500">Output Fields</label>
                            <button
                                onClick={() => {
                                    const currentFields = (node.config as ExpressionConfig).fields || [];
                                    updateTransformationConfig(node.id, {
                                        fields: [...currentFields, { name: `field_${currentFields.length + 1}`, expression: '' }]
                                    });
                                }}
                                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                            >
                                + Add Field
                            </button>
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {((node.config as ExpressionConfig).fields || []).map((field, idx) => (
                                <div key={idx} className="border rounded p-2 bg-gray-50 space-y-1">
                                    <div className="flex gap-2 items-center">
                                        <input
                                            className="flex-1 border rounded p-1 text-xs"
                                            placeholder="Output field name"
                                            value={field.name}
                                            onChange={e => {
                                                const fields = [...(node.config as ExpressionConfig).fields];
                                                fields[idx] = { ...fields[idx], name: e.target.value };
                                                updateTransformationConfig(node.id, { fields });
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                const fields = (node.config as ExpressionConfig).fields.filter((_, i) => i !== idx);
                                                updateTransformationConfig(node.id, { fields });
                                            }}
                                            className="text-red-500 hover:text-red-700 text-xs"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <input
                                        className="w-full border rounded p-1 text-xs font-mono"
                                        placeholder="Expression (e.g. price * quantity)"
                                        value={field.expression}
                                        onChange={e => {
                                            const fields = [...(node.config as ExpressionConfig).fields];
                                            fields[idx] = { ...fields[idx], expression: e.target.value };
                                            updateTransformationConfig(node.id, { fields });
                                        }}
                                    />
                                </div>
                            ))}
                            {((node.config as ExpressionConfig).fields || []).length === 0 && (
                                <p className="text-xs text-gray-400 italic">No fields defined. Add a field to transform data.</p>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400">
                            Expression examples: <code className="bg-gray-100 px-1 rounded">price * 1.1</code>,
                            <code className="bg-gray-100 px-1 rounded ml-1">firstName + " " + lastName</code>
                        </p>
                    </div>
                )}
            </div>
        );
    };

    if (editingMapping) {
        return (
            <div className="h-[600px] flex flex-col border rounded bg-white shadow-sm">
                <div className="p-2 border-b flex flex-wrap justify-between items-center bg-gray-50 gap-2">
                    <input
                        className="font-bold bg-transparent border-none focus:ring-0 text-sm min-w-0 flex-grow"
                        value={editingMapping.name}
                        onChange={e => setEditingMapping({ ...editingMapping, name: e.target.value })}
                    />
                    <div className="flex gap-2 shrink-0">
                        <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                            <Save size={14} /> <span className="hidden sm:inline">Save</span>
                        </button>
                        <button onClick={() => setEditingMapping(null)} className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300">
                            <X size={14} /> <span className="hidden sm:inline">Cancel</span>
                        </button>
                    </div>
                </div>

                <div className="flex-grow flex flex-col md:flex-row overflow-hidden relative">
                    {/* Toolbar */}
                    <div className="w-full md:w-12 h-auto md:h-full bg-gray-100 border-t md:border-t-0 md:border-r flex flex-row md:flex-col items-center justify-around md:justify-start py-2 md:py-4 gap-4 order-last md:order-first shrink-0">
                        <button title="Add Source" onClick={() => addTransformation('source')} className="p-1 rounded hover:bg-gray-200"><div className="w-8 h-8 bg-green-100 border-green-500 border rounded flex items-center justify-center text-[10px]">SRC</div></button>
                        <button title="Add Filter" onClick={() => addTransformation('filter')} className="p-1 rounded hover:bg-gray-200"><div className="w-8 h-8 bg-yellow-100 border-yellow-500 border rounded flex items-center justify-center text-[10px]">FLT</div></button>
                        <button title="Add Expression" onClick={() => addTransformation('expression')} className="p-1 rounded hover:bg-gray-200"><div className="w-8 h-8 bg-purple-100 border-purple-500 border rounded flex items-center justify-center text-[10px]">EXP</div></button>
                        <button title="Add Aggregator" onClick={() => addTransformation('aggregator')} className="p-1 rounded hover:bg-gray-200"><div className="w-8 h-8 bg-orange-100 border-orange-500 border rounded flex items-center justify-center text-[10px]">AGG</div></button>
                        <button title="Add Target" onClick={() => addTransformation('target')} className="p-1 rounded hover:bg-gray-200"><div className="w-8 h-8 bg-red-100 border-red-500 border rounded flex items-center justify-center text-[10px]">TGT</div></button>
                    </div>

                    {/* Canvas */}
                    <div className="flex-grow relative bg-gray-50">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            nodeTypes={nodeTypes}
                            onNodesChange={handleNodesChange}
                            onEdgesChange={handleEdgesChange}
                            onNodeClick={handleNodeClick}
                            onEdgeClick={handleEdgeClick}
                            onConnect={onConnect}
                            onInit={setRfInstance}
                            fitView
                            deleteKeyCode={['Backspace', 'Delete']}
                        >
                            <Background color="#aaa" gap={16} />
                            <Controls />
                            <Panel position="top-right">
                                <div className="flex gap-2">
                                    {selectedEdgeId && (
                                        <button
                                            onClick={deleteSelectedEdge}
                                            className="flex items-center gap-2 bg-red-500 text-white px-3 py-2 rounded shadow border border-red-600 hover:bg-red-600 text-sm font-medium cursor-pointer"
                                            title="Delete selected connection"
                                        >
                                            <Trash2 size={16} />
                                            Delete
                                        </button>
                                    )}
                                    <button
                                        onClick={onLayout}
                                        className="flex items-center gap-2 bg-white px-3 py-2 rounded shadow border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 cursor-pointer"
                                        title="Auto-align nodes"
                                    >
                                        <LayoutGrid size={16} />
                                        Align
                                    </button>
                                </div>
                            </Panel>
                        </ReactFlow>
                    </div>

                    {/* Properties */}
                    <div className={`bg-white overflow-y-auto absolute inset-0 z-20 md:static md:w-64 md:border-l ${selectedNodeId ? 'block' : 'hidden md:block'}`}>
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
