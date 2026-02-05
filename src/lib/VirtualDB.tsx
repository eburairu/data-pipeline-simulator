import React, { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

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
  // レコードの上限数（デフォルト: 10000）
  maxRecords?: number;
  // 上限到達時の警告を表示するか（デフォルト: true）
  showWarnings?: boolean;
}

// デフォルト設定
const DEFAULT_OPTIONS: Required<VirtualDBOptions> = {
  maxRecords: 10000,
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
  const [records, setRecords] = useState<DBRecord[]>([]);

  // 警告が既に表示されたかを追跡（同じ警告を繰り返さないため）
  const warningShownRef = useRef(false);

  const insert = useCallback((table: string, data: Record<string, unknown>) => {
    const newRecord: DBRecord = {
      id: Math.random().toString(36).substring(7),
      data,
      table,
      insertedAt: Date.now(),
    };
    setRecords((prev) => {
      // LRU方式でレコードをパージ
      // 上限に達している場合、最も古いレコードを削除
      if (prev.length >= config.maxRecords) {
        // 警告ログを出力（初回のみ）
        if (config.showWarnings && !warningShownRef.current) {
          console.warn(
            `[VirtualDB] レコード上限(${config.maxRecords})に達しました。古いレコードがLRU方式で自動削除されます。`
          );
          warningShownRef.current = true;
        }

        // insertedAtでソートし、最も古いレコードを除外して新しいレコードを追加
        // パフォーマンスのため、削除するレコード数を計算
        const recordsToRemove = prev.length - config.maxRecords + 1;
        const sorted = [...prev].sort((a, b) => a.insertedAt - b.insertedAt);
        const remaining = sorted.slice(recordsToRemove);
        return [...remaining, newRecord];
      }

      return [...prev, newRecord];
    });
    console.log(`[DB] Inserted into ${table}:`, data);
  }, [config.maxRecords, config.showWarnings]);

  const select = useCallback((table: string) => {
    return records.filter((r) => r.table === table);
  }, [records]);

  const query = useCallback((table: string, filters: DBFilter[]) => {
    let result = records.filter((r) => r.table === table);

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
  }, [records]);

  const update = useCallback((table: string, id: string, data: Record<string, unknown>) => {
    setRecords((prev) => prev.map(r => {
      if (r.table === table && r.id === id) {
        return { ...r, data: { ...r.data, ...data } }; // Merge updates
      }
      return r;
    }));
    console.log(`[DB] Updated record ${id} in ${table}:`, data);
  }, []);

  const remove = useCallback((table: string, id: string) => {
    setRecords((prev) => prev.filter(r => !(r.table === table && r.id === id)));
    console.log(`[DB] Deleted record ${id} from ${table}`);
  }, []);

  // 現在のレコード数を取得
  const getRecordCount = useCallback(() => {
    return records.length;
  }, [records.length]);

  // 最大レコード数を取得
  const getMaxRecords = useCallback(() => {
    return config.maxRecords;
  }, [config.maxRecords]);

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
