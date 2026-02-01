import React from 'react';
import { useSettings } from '../../lib/SettingsContext';
import { type TaskFlow } from '../../lib/MappingTypes';
import { Trash2, Plus, GitBranch } from 'lucide-react';

const TaskFlowSettings: React.FC = () => {
    const { taskFlows, addTaskFlow, updateTaskFlow, removeTaskFlow, mappingTasks } = useSettings();

    const handleAdd = () => {
        const newFlow: TaskFlow = {
            id: `tf_${Date.now()}`,
            name: 'New Task Flow',
            taskIds: [],
            executionInterval: 10000,
            enabled: true
        };
        addTaskFlow(newFlow);
    };

    const handleChange = (id: string, updates: Partial<TaskFlow>) => {
        updateTaskFlow(id, updates);
    };

    return (
        <div className="space-y-4 p-4 border rounded bg-white shadow-sm mt-6">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
                <GitBranch className="w-5 h-5" /> Task Flows (Orchestration)
            </h3>
            <p className="text-xs text-gray-500">Group multiple Mapping Tasks into a single execution flow.</p>

            <div className="space-y-4">
                {taskFlows.map(flow => (
                    <div key={flow.id} className="border p-4 rounded-md bg-gray-50 relative">
                        <div className="absolute top-2 right-2">
                            <button onClick={() => removeTaskFlow(flow.id)} className="text-red-500 hover:text-red-700" title="Delete Flow">
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="grid gap-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500">Flow Name</label>
                                    <input
                                        type="text"
                                        value={flow.name}
                                        onChange={(e) => handleChange(flow.id, { name: e.target.value })}
                                        className="w-full border rounded p-1 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500">Execution Interval (ms)</label>
                                    <input
                                        type="number"
                                        value={flow.executionInterval}
                                        onChange={(e) => handleChange(flow.id, { executionInterval: parseInt(e.target.value) || 0 })}
                                        className="w-full border rounded p-1 text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Included Mapping Tasks</label>
                                <div className="border rounded p-2 h-32 overflow-y-auto bg-white">
                                    {mappingTasks.map(task => (
                                        <label key={task.id} className="flex items-center gap-2 text-xs mb-1 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={flow.taskIds.includes(task.id)}
                                                onChange={(e) => {
                                                    const currentTaskIds = flow.taskIds;
                                                    let newTaskIds;
                                                    if (e.target.checked) {
                                                        newTaskIds = [...currentTaskIds, task.id];
                                                    } else {
                                                        newTaskIds = currentTaskIds.filter(id => id !== task.id);
                                                    }
                                                    handleChange(flow.id, { taskIds: newTaskIds });
                                                }}
                                                className="rounded border-gray-300 text-blue-600"
                                            />
                                            <span className="truncate">{task.name} <span className="text-gray-400">({task.id})</span></span>
                                        </label>
                                    ))}
                                    {mappingTasks.length === 0 && <span className="text-gray-400 italic text-[10px]">No mapping tasks defined</span>}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Tasks will be executed according to their dependencies or in order if parallel is disabled.</p>
                            </div>

                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={flow.enabled}
                                        onChange={(e) => handleChange(flow.id, { enabled: e.target.checked })}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700 font-medium">Enabled</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={flow.parallelExecution || false}
                                        onChange={(e) => handleChange(flow.id, { parallelExecution: e.target.checked })}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700 font-medium">Parallel Execution</span>
                                </label>
                            </div>
                        </div>
                    </div>
                ))}
                {taskFlows.length === 0 && <div className="text-gray-400 italic text-sm text-center py-4">No task flows defined.</div>}
            </div>

            <button
                onClick={handleAdd}
                className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors"
            >
                <Plus size={20} /> Add Task Flow
            </button>
        </div>
    );
};

export default TaskFlowSettings;
