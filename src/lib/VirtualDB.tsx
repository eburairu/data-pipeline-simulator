import React, { createContext, useContext, useState, useCallback, useRef, type ReactNode, useMemo } from 'react';
import { STORAGE } from './constants';

export interface DBRecord {
  id: string;
  data: Record<string, unknown>;
  table: string;
  insertedAt: number;
}

export interface DBFilter {
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains';
  value: string;
}

// VirtualDBの設定オプション
export interface VirtualDBOptions {
  // レコードの上限数
  maxRecords?: number;
  // 上限到達時の警告を表示するか（デフォルト: true）
  showWarnings?: boolean;
}

// デフォルト設定
const DEFAULT_OPTIONS: Required<VirtualDBOptions> = {
  maxRecords: STORAGE.DEFAULT_RECORD_LIMIT,
  showWarnings: true,
};

interface VirtualDBContextType {
  records: DBRecord[];
  insert: (table: string, data: Record<string, unknown>) => void;
  select: (table: string) => DBRecord[];
  query: (table: string, filters: DBFilter[]) => DBRecord[];
  update: (table: string, id: string, data: Record<string, unknown>) => void;
  remove: (table: string, id: string) => void;
  getRecordCount: () => number;
  getMaxRecords: () => number;
}

const VirtualDBContext = createContext<VirtualDBContextType | undefined>(undefined);

interface VirtualDBProviderProps {
  children: ReactNode;
  options?: VirtualDBOptions;
}

export const VirtualDBProvider: React.FC<VirtualDBProviderProps> = ({ children, options }) => {
  // 設定をマージ
  const config = { ...DEFAULT_OPTIONS, ...options };

  // FR-003: ページリロード時に全てのデータはリセットされる（永続化は行わない）
  // 最適化: テーブルごとにレコードを管理して高速化
  const [tableRecords, setTableRecords] = useState<Record<string, DBRecord[]>>({});

  // 警告が既に表示されたかを追跡（同じ警告を繰り返さないため）
  const warningShownRef = useRef(false);

  const insert = useCallback((table: string, data: Record<string, unknown>) => {
    const newRecord: DBRecord = {
      id: Math.random().toString(36).substring(7),
      data,
      table,
      insertedAt: Date.now(),
    };

    setTableRecords((prev) => {
      let totalRecords = 0;
      const tables = Object.keys(prev);
      for (const t of tables) {
        totalRecords += prev[t].length;
      }

      const next = { ...prev };
      // ターゲットテーブルの配列を初期化（なければ）
      if (!next[table]) {
        next[table] = [];
      }

      // LRU方式でレコードをパージ
      // 上限に達している場合、最も古いレコードを削除
      while (totalRecords >= config.maxRecords) {
        if (config.showWarnings && !warningShownRef.current) {
          console.warn(
            `[VirtualDB] レコード上限(${config.maxRecords})に達しました。古いレコードがLRU方式で自動削除されます。`
          );
          warningShownRef.current = true;
        }

        // 全テーブルの中で最も古いレコードを探す
        // 各テーブルの配列は時系列順（append only）なので、各配列の先頭のみ比較すればよい
        let oldestTable = '';
        let oldestTime = Infinity;

        for (const t of Object.keys(next)) {
          if (next[t].length > 0) {
            const record = next[t][0];
            if (record.insertedAt < oldestTime) {
              oldestTime = record.insertedAt;
              oldestTable = t;
            }
          }
        }

        if (oldestTable) {
          // 最も古いレコードを削除（先頭削除）
          const newTableRecords = [...next[oldestTable]];
          newTableRecords.shift();
          next[oldestTable] = newTableRecords;
          totalRecords--;
        } else {
          // レコードがないのにtotalRecords > 0の矛盾（通常ありえない）
          break;
        }
      }

      // 新しいレコードを追加
      next[table] = [...next[table], newRecord];
      return next;
    });
    console.log(`[DB] Inserted into ${table}:`, data);
  }, [config.maxRecords, config.showWarnings]);

  const select = useCallback((table: string) => {
    return tableRecords[table] || [];
  }, [tableRecords]);

  const query = useCallback((table: string, filters: DBFilter[]) => {
    let result = tableRecords[table] || [];

    if (filters && filters.length > 0) {
      result = result.filter(record => {
        return filters.every(filter => {
          const val = record.data[filter.column];
          const target = filter.value;

          if (val === undefined || val === null) return false;

          const isNum = !isNaN(Number(target)) && target.trim() !== '' && !isNaN(Number(val));
          const vNum = isNum ? Number(val) : NaN;
          const tNum = isNum ? Number(target) : NaN;

          switch (filter.operator) {
            case '=': return String(val) == target;
            case '!=': return String(val) != target;
            case '>': return isNum ? vNum > tNum : String(val) > target;
            case '<': return isNum ? vNum < tNum : String(val) < target;
            case '>=': return isNum ? vNum >= tNum : String(val) >= target;
            case '<=': return isNum ? vNum <= tNum : String(val) <= target;
            case 'contains': return String(val).toLowerCase().includes(target.toLowerCase());
            default: return true;
          }
        });
      });
    }
    return result;
  }, [tableRecords]);

  const update = useCallback((table: string, id: string, data: Record<string, unknown>) => {
    setTableRecords((prev) => {
      if (!prev[table]) return prev;
      return {
        ...prev,
        [table]: prev[table].map(r =>
          r.id === id ? { ...r, data: { ...r.data, ...data } } : r
        )
      };
    });
    console.log(`[DB] Updated record ${id} in ${table}:`, data);
  }, []);

  const remove = useCallback((table: string, id: string) => {
    setTableRecords((prev) => {
      if (!prev[table]) return prev;
      return {
        ...prev,
        [table]: prev[table].filter(r => r.id !== id)
      };
    });
    console.log(`[DB] Deleted record ${id} from ${table}`);
  }, []);

  // 現在のレコード数を取得
  const getRecordCount = useCallback(() => {
    return Object.values(tableRecords).reduce((acc, r) => acc + r.length, 0);
  }, [tableRecords]);

  // 最大レコード数を取得
  const getMaxRecords = useCallback(() => {
    return config.maxRecords;
  }, [config.maxRecords]);

  // 後方互換性のため、フラットなレコード配列を提供
  const records = useMemo(() => {
    return Object.values(tableRecords).flat().sort((a, b) => a.insertedAt - b.insertedAt);
  }, [tableRecords]);

  return (
    <VirtualDBContext.Provider
      value={{ records, insert, select, query, update, remove, getRecordCount, getMaxRecords }}
    >
      {children}
    </VirtualDBContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useVirtualDB = () => {
  const context = useContext(VirtualDBContext);
  if (!context) {
    throw new Error('useVirtualDB must be used within a VirtualDBProvider');
  }
  return context;
};
