import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

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

interface VirtualDBContextType {
  records: DBRecord[];
  insert: (table: string, data: Record<string, unknown>) => void;
  select: (table: string) => DBRecord[];
  query: (table: string, filters: DBFilter[]) => DBRecord[];
  update: (table: string, id: string, data: Record<string, unknown>) => void;
  remove: (table: string, id: string) => void;
}

const VirtualDBContext = createContext<VirtualDBContextType | undefined>(undefined);

export const VirtualDBProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [records, setRecords] = useState<DBRecord[]>([]);

  const insert = useCallback((table: string, data: Record<string, unknown>) => {
    const newRecord: DBRecord = {
      id: Math.random().toString(36).substring(7),
      data,
      table,
      insertedAt: Date.now(),
    };
    setRecords((prev) => [...prev, newRecord]);
    console.log(`[DB] Inserted into ${table}:`, data);
  }, []);

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

  return (
    <VirtualDBContext.Provider value={{ records, insert, select, query, update, remove }}>
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
