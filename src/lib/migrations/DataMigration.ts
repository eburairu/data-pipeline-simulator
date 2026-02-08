import { type DataSourceSettings, type GenerationJob, type BiDashboardSettings } from '../types';

export const migrateDataSourceSettings = (parsed: any): DataSourceSettings | null => {
  if (!parsed.dataSource) return null;

  // New format check
  if (parsed.dataSource.jobs && !parsed.dataSource.definitions) {
      return parsed.dataSource as DataSourceSettings;
  }

  // Migration from format with definitions
  if (parsed.dataSource.definitions && parsed.dataSource.jobs) {
    const definitions = parsed.dataSource.definitions as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newJobs: GenerationJob[] = parsed.dataSource.jobs.map((job: any) => {
        const def = definitions.find(d => d.id === job.dataSourceId);
        return {
            ...job,
            connectionId: '', // User needs to re-select
            path: def ? def.path : '',
        } as GenerationJob;
    });
    return { jobs: newJobs };
  }
  
  // Legacy array check (very old)
  if (Array.isArray(parsed.dataSource.jobs)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newJobs: GenerationJob[] = parsed.dataSource.jobs.map((oldJob: any) => ({
        ...oldJob,
        connectionId: '',
        path: oldJob.sourcePath || '',
        mode: oldJob.mode || 'template',
        rowCount: oldJob.rowCount || 1
    }));
    return { jobs: newJobs };
  }
  return null;
};

export const migrateBiDashboardSettings = (parsed: any): BiDashboardSettings | null => {
    if (!parsed.biDashboard) return null;

    if ('defaultTableId' in parsed.biDashboard) {
        // Legacy migration logic
        const old = parsed.biDashboard;
        return {
            showDashboard: old.showDashboard,
            items: old.defaultTableId ? [{
                id: 'dashboard_item_1',
                type: 'query',
                title: 'Default View',
                tableId: old.defaultTableId,
                viewType: old.defaultViewType || 'table',
                filters: [],
                refreshInterval: old.refreshInterval || 0
            }] : []
        };
    }

    // Ensure all items have a 'type' property (for settings that have items but no type yet)
    const settings = parsed.biDashboard as BiDashboardSettings;
    if (settings.items && Array.isArray(settings.items)) {
        settings.items = settings.items.map((item: any) => ({
            ...item,
            type: item.type || 'query'
        }));
    }

    return settings;
}
