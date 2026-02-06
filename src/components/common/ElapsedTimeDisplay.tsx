import React, { useState, useEffect, memo } from 'react';
import { TIMEOUTS } from '../../lib/constants';

interface ElapsedTimeDisplayProps {
  /** 開始時刻（ミリ秒）*/
  startTime: number;
  /** 終了時刻（ミリ秒）。未指定の場合は現在時刻からの経過を表示 */
  endTime?: number;
  /** 表示のクラス名 */
  className?: string;
}

/**
 * 経過時間を表示するコンポーネント。
 * endTimeが指定されていない（実行中の）場合は、独自のsetIntervalで毎秒更新。
 * これにより、親コンポーネントの再レンダリングを誘発せずに時間を更新できる。
 */
const ElapsedTimeDisplay: React.FC<ElapsedTimeDisplayProps> = memo(({
  startTime,
  endTime,
  className = ''
}) => {
  // endTimeがある（完了済み）場合は固定値、ない（実行中）場合はローカル状態で管理
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // 終了している場合はタイマー不要
    if (endTime) return;

    // 実行中の場合のみ毎秒更新
    const timer = setInterval(() => setNow(Date.now()), TIMEOUTS.ELAPSED_TIME_UPDATE);
    return () => clearInterval(timer);
  }, [endTime]);

  // 経過時間の計算
  const elapsed = (endTime || now) - startTime;

  // フォーマット: 1秒未満はms、それ以外はs
  const formatted = elapsed < 1000
    ? `${elapsed}ms`
    : `${(elapsed / 1000).toFixed(2)}s`;

  return <span className={className}>{formatted}</span>;
});

ElapsedTimeDisplay.displayName = 'ElapsedTimeDisplay';

export default ElapsedTimeDisplay;
