/**
 * BIダッシュボード - ウィジェットグリッド表示
 */
import React from 'react';
import { useSettings } from '../lib/SettingsContext';
import { Activity, AlertTriangle } from 'lucide-react';
import { getWidget } from './widgets';
import type { DashboardItem } from '../lib/types';

/** ウィジェット描画エラーを局所化するErrorBoundary */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-500 bg-red-50 text-red-700 rounded h-full overflow-auto flex flex-col items-start">
          <h3 className="font-bold flex items-center gap-2"><AlertTriangle size={16} /> Visualization Error</h3>
          <p className="text-sm mt-2">An error occurred while rendering the widget.</p>
          <div className="text-xs mt-2 bg-white p-2 border rounded overflow-x-auto w-full text-left">
            <p className="font-semibold">{this.state.error?.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const BiDashboard: React.FC = () => {
  const { biDashboard } = useSettings();

  if (!biDashboard.items || biDashboard.items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-white rounded border border-dashed p-8 m-4">
        <Activity size={48} className="mb-4 text-gray-300" />
        <p className="text-lg font-medium">No dashboard widgets configured.</p>
        <p className="text-sm mt-2">Go to <span className="font-bold">Settings &gt; BI Dashboard</span> to add and configure widgets.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 h-full overflow-y-auto pb-8 bg-gray-50">
      {biDashboard.items.map((item: DashboardItem) => {
        const WidgetComponent = getWidget(item.type);
        
        return (
          <ErrorBoundary key={item.id}>
            <div className={item.type === 'query' ? 'col-span-1 md:col-span-2 h-[500px]' : 'h-auto'}>
              {WidgetComponent ? (
                <WidgetComponent 
                  item={item}
                  {...(item as any)} 
                  title={item.title || item.name} 
                />
              ) : (
                <div className="p-4 border border-yellow-300 bg-yellow-50 text-yellow-700 rounded h-full flex flex-col items-center justify-center text-center">
                  <AlertTriangle size={24} className="mb-2" />
                  <p className="font-bold text-sm">Unknown Widget Type</p>
                  <p className="text-xs mt-1">Type: {item.type}</p>
                </div>
              )}
            </div>
          </ErrorBoundary>
        );
      })}
    </div>
  );
};

export default BiDashboard;
