import React, { useState } from 'react';
import InfrastructureSettings from './InfrastructureSettings';
import DatabaseSettings from './DatabaseSettings';
import DataSourceSettings from './DataSourceSettings';
import CollectionSettings from './CollectionSettings';
import TopicSettings from './TopicSettings';
import DeliverySettings from './DeliverySettings';
import ConnectionSettings from './ConnectionSettings';
import MappingDesigner from './MappingDesigner';
import MappingTaskSettings from './MappingTaskSettings';
import BiDashboardSettings from './BiDashboardSettings';
import { Database, ArrowLeftRight, Workflow, Server, Activity } from 'lucide-react';
import { useTranslation } from '../../lib/i18n/LanguageContext';

type SettingsTab = 'datasource' | 'integrationHub' | 'dataIntegration' | 'database' | 'bi';

const SettingsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('datasource');
  const { t } = useTranslation();

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'datasource', label: 'Data Source', icon: <Server size={16} /> },
    { id: 'integrationHub', label: 'Data Hub', icon: <ArrowLeftRight size={16} /> },
    { id: 'dataIntegration', label: 'Data Integration', icon: <Workflow size={16} /> },
    { id: 'database', label: t('settings.tabs.database'), icon: <Database size={16} /> },
    { id: 'bi', label: t('settings.tabs.bi'), icon: <Activity size={16} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'datasource' && (
          <div className="space-y-6">
            <InfrastructureSettings />
            <DataSourceSettings />
          </div>
        )}

        {activeTab === 'integrationHub' && (
          <div className="space-y-6">
            <TopicSettings />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CollectionSettings />
              <DeliverySettings />
            </div>
          </div>
        )}

        {activeTab === 'dataIntegration' && (
          <div className="space-y-6">
            <ConnectionSettings />
            <MappingDesigner />
            <MappingTaskSettings />
          </div>
        )}

        {activeTab === 'database' && (
          <div className="space-y-6">
            <DatabaseSettings />
          </div>
        )}

        {activeTab === 'bi' && (
          <div className="space-y-6">
            <BiDashboardSettings />
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
