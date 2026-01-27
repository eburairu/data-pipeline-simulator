import React from 'react';
import InfrastructureSettings from './InfrastructureSettings';
import DataSourceSettings from './DataSourceSettings';
import CollectionSettings from './CollectionSettings';
import TopicSettings from './TopicSettings';
import DeliverySettings from './DeliverySettings';
import ConnectionSettings from './ConnectionSettings';
import MappingDesigner from './MappingDesigner';
import MappingTaskSettings from './MappingTaskSettings';

const SettingsPanel: React.FC = () => {
  return (
    <div className="space-y-6">
      <InfrastructureSettings />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2 space-y-6">
             <h2 className="text-xl font-bold text-gray-800 border-b pb-2">IDMC CDI Settings</h2>
             <ConnectionSettings />
             <MappingDesigner />
             <MappingTaskSettings />
        </div>

        <div className="md:col-span-2 mt-8">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Legacy Simulation Settings</h2>
        </div>
        <DataSourceSettings />
        <CollectionSettings />
        <TopicSettings />
        <DeliverySettings />
      </div>
    </div>
  );
};

export default SettingsPanel;
