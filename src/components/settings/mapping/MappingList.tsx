import React from 'react';
import { Trash2, Plus, Edit3 } from 'lucide-react';
import type { Mapping } from '../../../lib/MappingTypes';

interface MappingListProps {
  mappings: Mapping[];
  readOnly: boolean;
  handleEdit: (m: Mapping) => void;
  handleDelete: (id: string) => void;
  handleCreate: () => void;
}

const MappingList: React.FC<MappingListProps> = ({
  mappings,
  readOnly,
  handleEdit,
  handleDelete,
  handleCreate,
}) => {
  return (
    <div className="space-y-4 p-4 border rounded bg-white shadow-sm">
      {!readOnly && (
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
          <Edit3 className="w-5 h-5" /> Mappings
        </h3>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mappings.map(m => (
          <div key={m.id} className="border p-4 rounded bg-gray-50 hover:shadow-md transition-shadow relative">
            <h4 className="font-bold text-gray-700">{m.name}</h4>
            <p className="text-xs text-gray-500 mt-1">{m.transformations.length} transformations</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => handleEdit(m)} className="text-blue-600 text-xs hover:underline flex items-center gap-1">
                <Edit3 size={12} /> {readOnly ? 'View' : 'Edit'}
              </button>
              {!readOnly && (
                <button onClick={() => handleDelete(m.id)} className="text-red-600 text-xs hover:underline flex items-center gap-1">
                  <Trash2 size={12} /> Delete
                </button>
              )}
            </div>
          </div>
        ))}

        {!readOnly && (
          <button
            onClick={handleCreate}
            className="border-2 border-dashed border-gray-300 rounded p-4 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors h-full min-h-[100px]"
          >
            <Plus size={24} />
            <span className="text-sm font-medium">Create New Mapping</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default MappingList;
