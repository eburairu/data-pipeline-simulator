import React from 'react';
import { Settings, Loader2, CheckCircle2, XCircle, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * ノードステータスの定義
 */
export type NodeStatus = 'idle' | 'running' | 'success' | 'error' | 'warning';

/**
 * ノードステータスに応じたボーダー・背景色クラスを返す
 */
export function getNodeStatusColor(status: NodeStatus): string {
  switch (status) {
    case 'running': return 'border-orange-500 bg-orange-50';
    case 'success': return 'border-green-500 bg-green-50';
    case 'error': return 'border-red-500 bg-red-50';
    case 'warning': return 'border-yellow-500 bg-yellow-50';
    default: return 'border-blue-500 bg-blue-50';
  }
}

/**
 * ノードステータスに応じたアイコンコンポーネントを返す
 */
export function getNodeStatusIcon(status: NodeStatus, customIcon?: React.ReactNode): React.ReactNode {
  switch (status) {
    case 'running': return React.createElement(Loader2, { className: "w-8 h-8 text-orange-600 animate-spin" });
    case 'success': return React.createElement(CheckCircle2, { className: "w-8 h-8 text-green-600" });
    case 'error': return React.createElement(XCircle, { className: "w-8 h-8 text-red-600" });
    case 'warning': return React.createElement(AlertCircle, { className: "w-8 h-8 text-yellow-600" });
    default: return customIcon ? React.createElement('div', { className: "text-blue-600" }, customIcon) : React.createElement(Settings, { className: "w-8 h-8 text-blue-600" });
  }
}

/**
 * ジョブステータスバッジの定義
 */
export type JobBadgeStatus = 'success' | 'failed' | 'running';

export interface JobBadgeConfig {
  bgColor: string;
  textColor: string;
  icon: React.ElementType;
  label: string;
}

/**
 * ジョブステータスに応じたバッジ設定を返す
 */
export function getJobStatusBadge(status: string): JobBadgeConfig {
  switch (status) {
    case 'success':
      return {
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
        icon: CheckCircle,
        label: 'Success'
      };
    case 'failed':
      return {
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        icon: XCircle,
        label: 'Failed'
      };
    case 'running':
    default:
      return {
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        icon: Loader2,
        label: 'Running'
      };
  }
}
