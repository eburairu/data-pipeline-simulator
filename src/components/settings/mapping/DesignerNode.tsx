/**
 * MappingDesigner用のカスタムノードコンポーネント
 */
import { Handle, Position } from 'reactflow';
import MetricEdge from '../../MetricEdge';

/** DesignerNodeのdata型 */
export interface DesignerNodeData {
  label: string;
  type: string;
  isSelected: boolean;
  stats?: {
    input: number;
    output: number;
    errors: number;
    rejects: number;
  };
}

/** ReactFlowデザイナーノード */
const DesignerNode = ({ data }: { data: DesignerNodeData }) => {
  const style = data.isSelected ? { border: '2px solid #2563eb' } : {};
  return (
    <div
      className="px-4 py-2 shadow-md rounded-md bg-white border border-gray-200 text-xs w-32 flex flex-col items-center justify-center relative"
      style={style}
    >
      <Handle type="target" position={Position.Left} className="w-2 h-2" />
      <div className="font-bold text-center truncate w-full">{data.label}</div>
      <div className="text-[10px] text-gray-500 uppercase">{data.type}</div>

      {/* 統計オーバーレイ */}
      {data.stats && (data.stats.input > 0 || data.stats.output > 0 || data.stats.errors > 0) && (
        <div className="absolute -top-3 -right-3 bg-white border border-gray-200 shadow-sm rounded-lg p-1 flex flex-col items-center text-[8px] z-10 min-w-[40px]">
          {data.stats.errors > 0 && <span className="text-red-600 font-bold">Err: {data.stats.errors}</span>}
          <span className="text-green-600">In: {data.stats.input}</span>
          <span className="text-blue-600">Out: {data.stats.output}</span>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="w-2 h-2" />
    </div>
  );
};

/** ReactFlowのnodeTypes定義 */
export const nodeTypes = {
  designer: DesignerNode,
};

/** ReactFlowのedgeTypes定義 */
export const edgeTypes = {
  metric: MetricEdge,
};

export default DesignerNode;
