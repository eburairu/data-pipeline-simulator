/**
 * クエリウィジェット用のチャートビュー
 */
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface QueryChartViewProps {
  /** チャートデータ */
  data: Record<string, unknown>[];
  /** X軸のキー */
  xAxis: string;
  /** Y軸のキー */
  yAxis: string;
}

const QueryChartView: React.FC<QueryChartViewProps> = ({ data, xAxis, yAxis }) => {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 italic">No results found</div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxis} tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: '10px' }} />
        <Line type="monotone" dataKey={yAxis} stroke="#2563eb" activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default QueryChartView;
