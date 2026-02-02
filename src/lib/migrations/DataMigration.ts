import { type DataSourceSettings, type DataSourceDefinition, type GenerationJob, type BiDashboardSettings } from '../types';

export const migrateDataSourceSettings = (parsed: any): DataSourceSettings | null => {
  if (!parsed.dataSource) return null;

  if (parsed.dataSource.definitions && parsed.dataSource.jobs) {
    return parsed.dataSource as DataSourceSettings;
  } else if (Array.isArray(parsed.dataSource.jobs)) {
    // Legacy migration logic (v1 -> v2)
    const newDefinitions: DataSourceDefinition[] = [];
    const newJobs: GenerationJob[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parsed.dataSource.jobs.forEach((oldJob: any) => {
      const defId = `ds_def_${oldJob.id}`;
      newDefinitions.push({
        id: defId,
        name: `${oldJob.name} Location`,
        host: oldJob.host,
        path: oldJob.sourcePath
      });
      newJobs.push({
        ...oldJob,
        dataSourceId: defId,
        mode: oldJob.mode || 'template',
        rowCount: oldJob.rowCount || 1
      });
    });
    return { definitions: newDefinitions, jobs: newJobs };
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
                title: 'Default View',
                tableId: old.defaultTableId,
                viewType: old.defaultViewType || 'table',
                filters: [],
                refreshInterval: old.refreshInterval || 0
            }] : []
        };
    }
    return parsed.biDashboard as BiDashboardSettings;
}
