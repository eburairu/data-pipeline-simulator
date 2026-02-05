import React from 'react';
import { useSettings } from '../../lib/SettingsContext';
import { validateTopic } from '../../lib/validation';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import { type FieldDefinition, type TopicDefinition } from '../../lib/types';

const TopicSettings: React.FC = () => {
  const { topics, addTopic, removeTopic, updateTopic } = useSettings();

  const handleTopicChange = (id: string, updates: Partial<TopicDefinition>) => {
    updateTopic(id, updates);
  };

  const handleAddTopic = () => {
    addTopic(`New Topic ${topics.length + 1}`, 60000); // Default 1 min
  };

  const addField = (topic: TopicDefinition) => {
    const currentSchema = topic.schema || [];
    const newField: FieldDefinition = { name: `field_${currentSchema.length + 1}`, type: 'string' };
    handleTopicChange(topic.id, { schema: [...currentSchema, newField] });
  };

  const updateField = (topic: TopicDefinition, index: number, fieldUpdates: Partial<FieldDefinition>) => {
    const currentSchema = topic.schema || [];
    const newSchema = [...currentSchema];
    newSchema[index] = { ...newSchema[index], ...fieldUpdates };
    handleTopicChange(topic.id, { schema: newSchema });
  };

  const removeField = (topic: TopicDefinition, index: number) => {
    const currentSchema = topic.schema || [];
    const newSchema = currentSchema.filter((_, i) => i !== index);
    handleTopicChange(topic.id, { schema: newSchema });
  };

  return (
    <div className="space-y-4 p-4 border rounded bg-white shadow-sm h-full overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Topic Management</h3>
      <p className="text-xs text-gray-500 mb-2">
        Define topics for Pub/Sub pattern. Data in topics is retained for the specified period.
        Define schema to enforce data structure.
      </p>

      <div className="space-y-4">
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
              <div className="grid gap-4">
                {/* Basic Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Topic Name</label>
                    <input
                      type="text"
                      value={topic.name}
                      onChange={(e) => handleTopicChange(topic.id, { name: e.target.value })}
                      className={`w-full border rounded p-1 text-sm ${hasError('name') ? 'border-red-500 bg-red-50' : ''}`}
                      title={getErrorMsg('name')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Retention Period (ms)</label>
                    <input
                      type="number"
                      value={topic.retentionPeriod}
                      onChange={(e) => handleTopicChange(topic.id, { retentionPeriod: parseInt(e.target.value) || 0 })}
                      className={`w-full border rounded p-1 text-sm ${hasError('retentionPeriod') ? 'border-red-500 bg-red-50' : ''}`}
                      title={getErrorMsg('retentionPeriod')}
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      {(topic.retentionPeriod / 1000).toFixed(1)} seconds
                    </div>
                  </div>
                </div>

                {/* Schema Settings */}
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-700">Schema Definition</label>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Enforcement:</label>
                      <select
                        value={topic.schemaEnforcement || 'none'}
                        onChange={(e) => handleTopicChange(topic.id, { schemaEnforcement: e.target.value as any })}
                        className="text-xs border rounded p-1 bg-white"
                      >
                        <option value="none">None (No Validation)</option>
                        <option value="lenient">Lenient (Validate defined fields)</option>
                        <option value="strict">Strict (Exact match)</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-white border rounded p-2 space-y-2">
                    {(topic.schema || []).length === 0 && (
                      <div className="text-center py-4 text-xs text-gray-400 italic">
                        No fields defined. Data will not be validated.
                      </div>
                    )}
                    {(topic.schema || []).map((field, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <GripVertical size={14} className="text-gray-300 cursor-move" />
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => updateField(topic, idx, { name: e.target.value })}
                          placeholder="Field Name"
                          className={`flex-1 border rounded p-1 text-xs ${hasError(`schema[${idx}].name`) ? 'border-red-500 bg-red-50' : ''}`}
                          title={getErrorMsg(`schema[${idx}].name`)}
                        />
                        <select
                          value={field.type}
                          onChange={(e) => updateField(topic, idx, { type: e.target.value as any })}
                          className="w-24 border rounded p-1 text-xs"
                        >
                          <option value="string">String</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="date">Date</option>
                          <option value="object">Object</option>
                        </select>
                        <button
                          onClick={() => removeField(topic, idx)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addField(topic)}
                      className="w-full py-1 text-xs text-blue-500 border border-dashed border-blue-200 rounded hover:bg-blue-50 flex items-center justify-center gap-1"
                    >
                      <Plus size={14} /> Add Field
                    </button>
                  </div>
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
