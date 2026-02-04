import React from 'react';
import { useSettings } from '../../lib/SettingsContext';
import { validateTopic } from '../../lib/validation';
import { Trash2, Plus, Table } from 'lucide-react';

const TopicSettings: React.FC = () => {
  const { topics, addTopic, removeTopic, updateTopic } = useSettings();

  const handleTopicChange = (id: string, field: 'name' | 'retentionPeriod', value: any) => {
    const topic = topics.find(t => t.id === id);
    if (!topic) return;

    if (field === 'name') updateTopic(id, { name: value });
    if (field === 'retentionPeriod') updateTopic(id, { retentionPeriod: value });
  };

  const handleAddTopic = () => {
    addTopic(`New Topic ${topics.length + 1}`, 60000); // Default 1 min
  };

  const addColumn = (topicId: string) => {
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;
    const newSchema = [...(topic.schema || []), { name: '', type: 'string' }];
    updateTopic(topicId, { schema: newSchema });
  };

  const updateColumn = (topicId: string, index: number, field: 'name' | 'type', value: string) => {
    const topic = topics.find(t => t.id === topicId);
    if (!topic || !topic.schema) return;
    const newSchema = [...topic.schema];
    newSchema[index] = { ...newSchema[index], [field]: value };
    updateTopic(topicId, { schema: newSchema });
  };

  const removeColumn = (topicId: string, index: number) => {
    const topic = topics.find(t => t.id === topicId);
    if (!topic || !topic.schema) return;
    const newSchema = topic.schema.filter((_, i) => i !== index);
    updateTopic(topicId, { schema: newSchema });
  };

  return (
    <div className="space-y-4 p-4 border rounded bg-white shadow-sm h-full overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Topic Management</h3>
      <p className="text-xs text-gray-500 mb-2">
        Define topics for Pub/Sub pattern. Data in topics is retained for the specified period.
        Define schemas to enforce data structure validation during publication.
      </p>

      <div className="space-y-6">
        {topics.map((topic) => {
          const errors = validateTopic(topic);
          const hasError = (field: string) => errors.some(e => e.field === field);
          const getErrorMsg = (field: string) => errors.find(e => e.field === field)?.message;

          return (
            <div key={topic.id} className="border p-4 rounded-md bg-gray-50 relative">
              <div className="absolute top-2 right-2">
                <button
                  onClick={() => removeTopic(topic.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Delete Topic"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="grid gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500">Topic Name</label>
                  <input
                    type="text"
                    value={topic.name}
                    onChange={(e) => handleTopicChange(topic.id, 'name', e.target.value)}
                    className={`w-full border rounded p-1 text-sm ${hasError('name') ? 'border-red-500 bg-red-50' : ''}`}
                    title={getErrorMsg('name')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Retention Period (ms)</label>
                  <input
                    type="number"
                    value={topic.retentionPeriod}
                    onChange={(e) => handleTopicChange(topic.id, 'retentionPeriod', parseInt(e.target.value) || 0)}
                    className={`w-full border rounded p-1 text-sm ${hasError('retentionPeriod') ? 'border-red-500 bg-red-50' : ''}`}
                    title={getErrorMsg('retentionPeriod')}
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    {(topic.retentionPeriod / 1000).toFixed(1)} seconds
                  </div>
                </div>
              </div>

              {/* Schema Editor */}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <Table size={12} /> Schema Definition (Optional)
                    </label>
                </div>

                {(!topic.schema || topic.schema.length === 0) && (
                    <div className="text-xs text-gray-400 italic mb-2">No schema defined. Any data structure is accepted.</div>
                )}

                <div className="space-y-2">
                    {topic.schema?.map((col, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                            <input
                                className="flex-1 border rounded p-1 text-xs"
                                placeholder="Column Name"
                                value={col.name}
                                onChange={e => updateColumn(topic.id, idx, 'name', e.target.value)}
                            />
                            <select
                                className="w-24 border rounded p-1 text-xs"
                                value={col.type}
                                onChange={e => updateColumn(topic.id, idx, 'type', e.target.value)}
                            >
                                <option value="string">String</option>
                                <option value="number">Number</option>
                                <option value="boolean">Boolean</option>
                                <option value="date">Date</option>
                            </select>
                            <button
                                onClick={() => removeColumn(topic.id, idx)}
                                className="text-gray-400 hover:text-red-500"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => addColumn(topic.id)}
                        className="text-blue-600 text-xs hover:underline flex items-center gap-1 mt-1"
                    >
                        <Plus size={12} /> Add Column
                    </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleAddTopic}
        className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors"
      >
        <Plus size={20} /> Add Topic
      </button>
    </div>
  );
};

export default TopicSettings;
