import React from 'react';
import { useSettings } from '../../lib/SettingsContext';
import { type MappingTask } from '../../lib/MappingTypes';
import { Trash2, Plus, PlayCircle } from 'lucide-react';

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
