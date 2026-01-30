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
import { useSettings } from '../../lib/SettingsContext';
import { Database, ArrowLeftRight, Workflow, Server, LayoutDashboard } from 'lucide-react';

type SettingsTab = 'datasource' | 'transfer' | 'processing' | 'database' | 'visualization';

const SettingsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('datasource');
  const { visualization, setVisualization } = useSettings();

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'datasource', label: 'データソース', icon: <Server size={16} /> },
    { id: 'transfer', label: '集配信', icon: <ArrowLeftRight size={16} /> },
    { id: 'processing', label: '加工処理', icon: <Workflow size={16} /> },
    { id: 'database', label: 'データベース', icon: <Database size={16} /> },
    { id: 'visualization', label: 'ビジュアライゼーション', icon: <LayoutDashboard size={16} /> },
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

        {activeTab === 'transfer' && (
          <div className="space-y-6">
            <TopicSettings />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CollectionSettings />
              <DeliverySettings />
            </div>
          </div>
        )}

        {activeTab === 'processing' && (
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

        {activeTab === 'visualization' && (
          <div className="space-y-6">
            <div className="bg-white border rounded p-4 shadow-sm">
                <h3 className="font-bold border-b pb-2 mb-4 text-gray-700 flex items-center gap-2">
                    <LayoutDashboard size={18} /> ダッシュボード設定
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="showDashboard"
                            checked={visualization.showDashboard}
                            onChange={(e) => setVisualization({...visualization, showDashboard: e.target.checked})}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                        />
                        <div className="flex flex-col">
                            <label htmlFor="showDashboard" className="text-sm font-medium text-gray-700 cursor-pointer">BIダッシュボードを表示する</label>
                            <span className="text-xs text-gray-500">シミュレーション画面にチャートとデータ分析ツールを表示します。</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
