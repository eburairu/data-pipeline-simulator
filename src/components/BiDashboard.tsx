/**
 * BIダッシュボード - ウィジェットグリッド表示
 */
import React from 'react';
import { useSettings } from '../lib/SettingsContext';
import { Activity, AlertTriangle } from 'lucide-react';
import QueryWidget from './widgets/QueryWidget';

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
          <p className="text-sm mt-2">An error occurred while rendering the dashboard.</p>
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full overflow-y-auto pb-8">
      {biDashboard.items.map(item => (
        <ErrorBoundary key={item.id}>
          <div className="h-auto min-h-[500px] lg:h-[800px]">
            <QueryWidget item={item} />
          </div>
        </ErrorBoundary>
      ))}
    </div>
  );
};

export default BiDashboard;
