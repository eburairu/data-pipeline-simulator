import React from 'react';
import { useSettings } from '../../lib/SettingsContext';
import { type MappingTask } from '../../lib/MappingTypes';
import { Trash2, Plus, PlayCircle } from 'lucide-react';
import ParamInput from '../common/ParamInput';

const MappingTaskSettings: React.FC = () => {
    const { mappingTasks, addMappingTask, updateMappingTask, removeMappingTask, mappings } = useSettings();

    const handleAdd = () => {
        if (mappings.length === 0) {
            alert("Please define a Mapping first.");
            return;
        }
        const newTask: MappingTask = {
            id: `mt_${Date.now()}`,
            name: 'New Mapping Task',
            mappingId: mappings[0].id,
            executionInterval: 5000,
            enabled: true
        };
        addMappingTask(newTask);
    };

    const handleChange = (id: string, updates: Partial<MappingTask>) => {
        updateMappingTask(id, updates);
    };

    return (
        <div className="space-y-4 p-4 border rounded bg-white shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
                <PlayCircle className="w-5 h-5" /> Mapping Tasks (Execution)
            </h3>
            <p className="text-xs text-gray-500">Schedule execution of defined Mappings.</p>

            <div className="space-y-4">
                {mappingTasks.map(task => (
                    <div key={task.id} className="border p-4 rounded-md bg-gray-50 relative">
                        <div className="absolute top-2 right-2">
                            <button onClick={() => removeMappingTask(task.id)} className="text-red-500 hover:text-red-700" title="Delete Task">
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="grid gap-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500">Task Name</label>
                                    <input
                                        type="text"
                                        value={task.name}
                                        onChange={(e) => handleChange(task.id, { name: e.target.value })}
                                        className="w-full border rounded p-1 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500">Underlying Mapping</label>
                                    <select
                                        value={task.mappingId}
                                        onChange={(e) => handleChange(task.id, { mappingId: e.target.value })}
                                        className="w-full border rounded p-1 text-sm bg-white"
                                    >
                                        {mappings.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500">Execution Interval (ms)</label>
                                    <input
                                        type="number"
                                        value={task.executionInterval}
                                        onChange={(e) => handleChange(task.id, { executionInterval: parseInt(e.target.value) || 0 })}
                                        className="w-full border rounded p-1 text-sm"
                                    />
                                </div>
                                <div className="flex items-center pt-5">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={task.enabled}
                                            onChange={(e) => handleChange(task.id, { enabled: e.target.checked })}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">Enabled</span>
                                    </label>
                                </div>
                            </div>

                            {/* Advanced Settings: Dependencies & Parameters */}
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Bad File Directory (Optional)</label>
                                    <input
                                        type="text"
                                        value={task.badFileDir || ''}
                                        placeholder="/bad_files/"
                                        onChange={(e) => handleChange(task.id, { badFileDir: e.target.value })}
                                        className="w-full border rounded p-1 text-sm font-mono"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Directory to store rejected rows as CSV files.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Stop on Errors (Threshold)</label>
                                    <input
                                        type="number"
                                        value={task.stopOnErrors || 0}
                                        onChange={(e) => handleChange(task.id, { stopOnErrors: parseInt(e.target.value) || 0 })}
                                        className="w-full border rounded p-1 text-sm"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Stop execution if errors exceed this count (0 = disabled).</p>
                                </div>
                            </div>

                            <div className="mt-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Parameter File Path (Optional)</label>
                                <input
                                    type="text"
                                    value={task.parameterFileName || ''}
                                    placeholder="host1:/config/params.txt"
                                    onChange={(e) => handleChange(task.id, { parameterFileName: e.target.value })}
                                    className="w-full border rounded p-1 text-sm font-mono"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Path to external parameter file (key=value format).</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 border-t pt-3 mt-1">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Dependencies (Wait for these tasks)</label>
                                    <div className="border rounded p-2 h-32 overflow-y-auto bg-white">
                                        {mappingTasks.filter(t => t.id !== task.id).map(otherTask => (
                                            <label key={otherTask.id} className="flex items-center gap-2 text-xs mb-1 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={task.dependencies?.includes(otherTask.id) || false}
                                                    onChange={(e) => {
                                                        const currentDeps = task.dependencies || [];
                                                        let newDeps;
                                                        if (e.target.checked) {
                                                            newDeps = [...currentDeps, otherTask.id];
                                                        } else {
                                                            newDeps = currentDeps.filter(d => d !== otherTask.id);
                                                        }
                                                        handleChange(task.id, { dependencies: newDeps });
                                                    }}
                                                    className="rounded border-gray-300 text-blue-600"
                                                />
                                                <span className="truncate">{otherTask.name}</span>
                                            </label>
                                        ))}
                                        {mappingTasks.length <= 1 && <span className="text-gray-400 italic text-[10px]">No other tasks available</span>}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Parameters (Key=Value)</label>
                                    <ParamInput
                                        value={task.parameters || {}}
                                        onChange={(params) => handleChange(task.id, { parameters: params })}
                                        placeholder={"DB_NAME=metrics_db\nLIMIT=100"}
                                        className="h-32"
                                        rows={6}
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        One per line. Used for substitution (e.g. <code>${"{PARAM}"}</code>).
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {mappingTasks.length === 0 && <div className="text-gray-400 italic text-sm text-center py-4">No mapping tasks defined.</div>}
            </div>

            <button
                onClick={handleAdd}
                className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors"
            >
                <Plus size={20} /> Add Mapping Task
            </button>
        </div>
    );
};

export default MappingTaskSettings;
