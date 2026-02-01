import React, { useState } from 'react';
import { useSettings } from '../../lib/SettingsContext';
import { Wand2, Trash, X } from 'lucide-react';

export const TemplateManager: React.FC = () => {
    const { availableTemplates, applyTemplate, cleanupTemplate } = useSettings();
    const [isOpen, setIsOpen] = useState(false);

    const handleApply = (id: string, name: string) => {
        if (window.confirm(`Apply template "${name}"? 
This will create new resources in your configuration.`)) {
            applyTemplate(id);
            setIsOpen(false);
        }
    };

    const handleCleanup = (id: string, name: string) => {
        if (window.confirm(`Remove resources for template "${name}"? 
This will delete generated resources associated with this template.`)) {
            cleanupTemplate(id);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors shadow-sm"
                title="Manage Pipeline Templates"
            >
                <Wand2 size={14} />
                Templates
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50 p-4">
                    <div className="flex justify-between items-center mb-3 border-b pb-2">
                        <h3 className="font-semibold text-gray-800 text-sm">Pipeline Templates</h3>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={16} />
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        {availableTemplates.map(template => (
                            <div key={template.id} className="border rounded p-3 bg-gray-50">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-xs text-gray-700">{template.name}</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mb-3 leading-tight">{template.description}</p>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => handleCleanup(template.id, template.name)}
                                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded border border-gray-200 transition-colors"
                                        title="Cleanup Resources"
                                    >
                                        <Trash size={12} />
                                    </button>
                                    <button
                                        onClick={() => handleApply(template.id, template.name)}
                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                                    >
                                        <Wand2 size={10} /> Apply
                                    </button>
                                </div>
                            </div>
                        ))}
                        
                        {availableTemplates.length === 0 && (
                            <div className="text-center text-gray-400 text-xs py-4">
                                No templates available.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};