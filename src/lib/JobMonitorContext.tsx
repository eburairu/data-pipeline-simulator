import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type JobType = 'collection' | 'delivery' | 'mapping' | 'taskflow';
export type JobStatus = 'success' | 'failed' | 'running';

export interface MappingExecutionDetails {
  transformations: {
    [transformationId: string]: { name: string; input: number; output: number; errors: number; rejects: number };
  };
  links?: { [linkId: string]: number };
  rejectRows?: { row: any; error: string; transformationName: string }[];
}

export interface TransferExecutionDetails {
  fileSize?: number;
  bandwidth?: number;
  throughput?: number;
}

export interface JobExecutionLog {
  id: string; // Log ID (UUID)
  jobId: string; // Job Definition ID
  jobName: string;
  jobType: JobType;
  status: JobStatus;
  startTime: number;
  endTime?: number;
  recordsInput: number;
  recordsOutput: number;
  errorMessage?: string;
  details?: string; // Filename or other context
  extendedDetails?: MappingExecutionDetails | TransferExecutionDetails;
}

interface JobMonitorContextType {
  logs: JobExecutionLog[];
  addLog: (log: Omit<JobExecutionLog, 'id'>) => string; // Return the new Log ID
  updateLog: (logId: string, updates: Partial<JobExecutionLog>) => void;
  clearLogs: () => void;
  retryJob: (jobId: string, jobType: JobType) => void;
}

const JobMonitorContext = createContext<JobMonitorContextType | undefined>(undefined);

const MAX_LOGS = 200;

export const JobMonitorProvider: React.FC<{ children: ReactNode; retryJob?: (jobId: string, jobType: JobType) => void }> = ({ children, retryJob }) => {
  const [logs, setLogs] = useState<JobExecutionLog[]>([]);

  const addLog = useCallback((logData: Omit<JobExecutionLog, 'id'>) => {
    const newLog: JobExecutionLog = {
      ...logData,
      id: crypto.randomUUID(),
    };

    setLogs((prev) => {
      const updated = [newLog, ...prev];
      if (updated.length > MAX_LOGS) {
        return updated.slice(0, MAX_LOGS);
      }
      return updated;
    });
    return newLog.id;
  }, []);

  const updateLog = useCallback((logId: string, updates: Partial<JobExecutionLog>) => {
    setLogs((prev) => prev.map(log =>
      log.id === logId ? { ...log, ...updates } : log
    ));
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const handleRetry = retryJob || ((id, type) => console.warn(`Retry not implemented for ${type} job ${id}`));

  return (
    <JobMonitorContext.Provider value={{ logs, addLog, updateLog, clearLogs, retryJob: handleRetry }}>
      {children}
    </JobMonitorContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useJobMonitor = () => {
  const context = useContext(JobMonitorContext);
  if (!context) {
    throw new Error('useJobMonitor must be used within a JobMonitorProvider');
  }
  return context;
};
