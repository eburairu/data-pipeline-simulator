import type { 
    DataSourceSettings, 
    TableDefinition, 
    ConnectionDefinition, 
    Host,
    DataSourceDefinition,
    GenerationJob
} from './SettingsContext';
import type { Mapping, MappingTask, TaskFlow } from './MappingTypes';

export interface TemplateContextActions {
    setDataSource: React.Dispatch<React.SetStateAction<DataSourceSettings>>;
    setTables: React.Dispatch<React.SetStateAction<TableDefinition[]>>;
    setConnections: React.Dispatch<React.SetStateAction<ConnectionDefinition[]>>;
    setMappings: React.Dispatch<React.SetStateAction<Mapping[]>>;
    setMappingTasks: React.Dispatch<React.SetStateAction<MappingTask[]>>;
    setTaskFlows: React.Dispatch<React.SetStateAction<TaskFlow[]>>;
    setHosts: React.Dispatch<React.SetStateAction<Host[]>>;
}

export interface PipelineTemplate {
    id: string;
    name: string;
    description: string;
    apply: (actions: TemplateContextActions) => void;
    cleanup: (actions: TemplateContextActions) => void;
}

export const IdempotencyTemplate: PipelineTemplate = {
    id: 'idempotency-test',
    name: 'Idempotency & Deduplication',
    description: 'Sets up a data generator producing duplicate IDs, a target database table, and a mapping with deduplication logic to test idempotent data loading.',
    apply: ({ setDataSource, setTables, setConnections, setMappings, setMappingTasks, setHosts }) => {
        const timestamp = Date.now();
        const hostName = 'localhost';
        const sourcePath = '/idempotency_source';
        const idSuffix = '_idem_';

        // 1. Ensure Host Directory
        setHosts(prev => {
            const host = prev.find(h => h.name === hostName);
            if (!host) return prev;
            if (host.directories.includes(sourcePath)) return prev;
            return prev.map(h => h.name === hostName ? { ...h, directories: [...h.directories, sourcePath] } : h);
        });

        // 2. Data Source
        const dsDefId = `ds_def${idSuffix}${timestamp}`;
        const newDsDef: DataSourceDefinition = {
            id: dsDefId,
            name: 'Idempotency Test Source',
            host: hostName,
            path: sourcePath
        };

        const newDsJob: GenerationJob = {
            id: `gen_job${idSuffix}${timestamp}`,
            name: 'Generate Duplicates',
            dataSourceId: dsDefId,
            fileNamePattern: 'data_${timestamp}.csv',
            fileContent: '',
            mode: 'schema',
            rowCount: 5,
            schema: [
                { id: `c_${timestamp}_1`, name: 'id', type: 'randomInt', params: { min: 1, max: 10 } },
                { id: `c_${timestamp}_2`, name: 'value', type: 'randomInt', params: { min: 100, max: 999 } },
                { id: `c_${timestamp}_3`, name: 'updated_at', type: 'timestamp', params: {} }
            ],
            executionInterval: 5000,
            enabled: true
        };

        setDataSource(prev => ({
            definitions: [...prev.definitions, newDsDef],
            jobs: [...prev.jobs, newDsJob]
        }));

        // 3. Target Table
        const tableId = `tbl${idSuffix}${timestamp}`;
        const tableName = 'idempotency_target';
        const newTable: TableDefinition = {
            id: tableId,
            name: tableName,
            columns: [
                { name: 'id', type: 'number' },
                { name: 'value', type: 'number' },
                { name: 'updated_at', type: 'string' }
            ]
        };
        setTables(prev => [...prev, newTable]);

        // 4. Connections
        const connSrcId = `conn_src${idSuffix}${timestamp}`;
        const connTgtId = `conn_tgt${idSuffix}${timestamp}`;
        
        setConnections(prev => [
            ...prev,
            {
                id: connSrcId,
                name: 'Idempotency Source File',
                type: 'file',
                host: hostName,
                path: sourcePath
            },
            {
                id: connTgtId,
                name: 'Idempotency Target DB',
                type: 'database',
                tableName: tableName
            }
        ]);

        // 5. Mapping
        const mappingId = `m${idSuffix}${timestamp}`;
        const tSrcId = `t_src_${timestamp}`;
        const tDedupId = `t_dedup_${timestamp}`;
        const tTgtId = `t_tgt_${timestamp}`;

        const newMapping: Mapping = {
            id: mappingId,
            name: 'Idempotency Load (Dedup)',
            transformations: [
                { 
                    id: tSrcId, 
                    type: 'source', 
                    name: 'Read CSV', 
                    position: { x: 50, y: 100 }, 
                    config: { connectionId: connSrcId, deleteAfterRead: true } 
                },
                { 
                    id: tDedupId, 
                    type: 'deduplicator', 
                    name: 'Deduplicate IDs', 
                    position: { x: 300, y: 100 }, 
                    config: { keys: ['id'] } 
                },
                { 
                    id: tTgtId, 
                    type: 'target', 
                    name: 'Upsert to DB', 
                    position: { x: 550, y: 100 }, 
                    config: { 
                        connectionId: connTgtId,
                        deduplicationKeys: ['id'],
                        duplicateBehavior: 'update',
                        updateColumns: ['id']
                    } 
                }
            ],
            links: [
                { id: `l_1_${timestamp}`, sourceId: tSrcId, targetId: tDedupId },
                { id: `l_2_${timestamp}`, sourceId: tDedupId, targetId: tTgtId }
            ]
        };
        setMappings(prev => [...prev, newMapping]);

        // 6. Task
        const taskId = `mt${idSuffix}${timestamp}`;
        setMappingTasks(prev => [...prev, {
            id: taskId,
            name: 'Run Idempotency Test',
            mappingId: mappingId,
            executionInterval: 5000,
            enabled: true
        }]);
    },
    cleanup: ({ setDataSource, setTables, setConnections, setMappings, setMappingTasks }) => {
        const idSuffix = '_idem_';
        
        setDataSource(prev => ({
            definitions: prev.definitions.filter(d => !d.id.includes(idSuffix)),
            jobs: prev.jobs.filter(j => !j.id.includes(idSuffix))
        }));

        setTables(prev => prev.filter(t => !t.id.includes(idSuffix)));
        setConnections(prev => prev.filter(c => !c.id.includes(idSuffix)));
        setMappings(prev => prev.filter(m => !m.id.includes(idSuffix)));
        setMappingTasks(prev => prev.filter(t => !t.id.includes(idSuffix)));
    }
};

export const AVAILABLE_TEMPLATES: PipelineTemplate[] = [
    IdempotencyTemplate
];