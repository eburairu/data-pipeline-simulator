import React from 'react';
import { useSettings } from '../../lib/SettingsContext';
import { validateTopic } from '../../lib/validation';
import { Trash2, Plus } from 'lucide-react';

const TopicSettings: React.FC = () => {
  const { topics, addTopic, removeTopic, updateTopic } = useSettings();

  const handleTopicChange = (id: string, field: 'name' | 'retentionPeriod', value: any) => {
    const topic = topics.find(t => t.id === id);
    if (!topic) return;

    const newName = field === 'name' ? value : topic.name;
    const newRetention = field === 'retentionPeriod' ? value : topic.retentionPeriod;

    updateTopic(id, newName, newRetention);
  };

  const handleAddTopic = () => {
    addTopic(`New Topic ${topics.length + 1}`, 60000); // Default 1 min
  };

  return (
    <div className="space-y-4 p-4 border rounded bg-white shadow-sm h-full">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Topic Management</h3>
      <p className="text-xs text-gray-500 mb-2">
        Define topics for Pub/Sub pattern. Data in topics is retained for the specified period.
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
              <div className="grid gap-3">
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
