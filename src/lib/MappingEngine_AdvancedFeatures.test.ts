import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeMappingTaskRecursive, type ExecutionState, type DbRecord, type FileSystemOps, type DbOps } from './MappingEngine';
import type { MappingTask, Mapping, LookupTransformation, TargetTransformation, SourceConfig, Transformation } from './MappingTypes';
import type { ConnectionDefinition, TableDefinition, TopicDefinition } from './types';

describe('MappingEngine Advanced Features', () => {
    let mockFs: FileSystemOps;
    let mockDb: DbOps;
    let connections: ConnectionDefinition[];
    let tables: TableDefinition[];
    let topics: TopicDefinition[];

    beforeEach(() => {
        vi.clearAllMocks();

        mockFs = {
            listFiles: vi.fn().mockReturnValue([]),
            readFile: vi.fn().mockReturnValue(''),
            deleteFile: vi.fn(),
            writeFile: vi.fn()
        };

        mockDb = {
            select: vi.fn().mockReturnValue([]),
            insert: vi.fn(),
            update: vi.fn(),
            delete: vi.fn()
        };

        connections = [
            { id: 'conn1', name: 'DB Connection', type: 'database', host: 'localhost' },
            { id: 'conn2', name: 'File Connection', type: 'file', host: 'localhost' }
        ];

        tables = [
            { id: 't1', name: 'lookup_table', columns: [{ name: 'id', type: 'string' }, { name: 'val', type: 'string' }] }
        ];

        topics = [];
    });

    describe('Persistent Lookup Cache', () => {
        it('should create cache file on first run and use it on second run', async () => {
            const task: MappingTask = { id: 'task1', name: 'Test Task', mappingId: 'map1', stopOnErrors: 1 };

            const lookupNode: LookupTransformation = {
                id: 'lookup1',
                name: 'Lookup',
                type: 'lookup',
                config: {
                    connectionId: 'conn1',
                    tableName: 'lookup_table',
                    lookupKeys: ['id'],
                    referenceKeys: ['id'],
                    returnFields: ['val'],
                    cacheType: 'persistent',
                    persistentCacheFileName: 'my_cache.json'
                }
            };

            const sourceNode: Transformation = {
                id: 'source1',
                name: 'Source',
                type: 'source',
                config: {
                    connectionId: 'conn2',
                    path: '/in',
                    filenameColumn: 'filename'
                } as SourceConfig
            };

            const targetNode: TargetTransformation = {
                id: 'target1',
                name: 'Target',
                type: 'target',
                config: {
                    connectionId: 'conn2',
                    path: '/out',
                    targetType: 'connection'
                }
            };

            const mapping: Mapping = {
                id: 'map1',
                name: 'Test Mapping',
                transformations: [sourceNode, lookupNode, targetNode],
                links: [
                    { id: 'l1', sourceId: 'source1', targetId: 'lookup1' },
                    { id: 'l2', sourceId: 'lookup1', targetId: 'target1' }
                ]
            };

            // Mock Input Data
            const inputData = [{ id: '1', name: 'A' }];
            // Mock DB Data
            const dbData = [{ id: '1', val: 'Value1' }];

            // Setup Mocks
            (mockFs.listFiles as any).mockImplementation((host: string, path: string) => {
                if (path === '/in') return [{ name: 'input.json', content: JSON.stringify(inputData) }];
                return [];
            });
            (mockFs.readFile as any).mockImplementation((host: string, path: string, file: string) => {
                 if (path === '/in' && file === 'input.json') return JSON.stringify(inputData);
                 return ''; // Cache file not found initially
            });
            (mockDb.select as any).mockReturnValue(dbData);

            // First Run
            await executeMappingTaskRecursive(task, mapping, connections, tables, topics, mockFs, mockDb, {});

            // Verify DB Access and File Write
            expect(mockDb.select).toHaveBeenCalledWith('lookup_table');
            expect(mockFs.writeFile).toHaveBeenCalledWith(
                'localhost',
                '/cache/',
                'my_cache.json',
                JSON.stringify(dbData)
            );

            // Reset Mocks for Second Run
            vi.clearAllMocks();
            (mockFs.listFiles as any).mockImplementation((host: string, path: string) => {
                if (path === '/in') return [{ name: 'input.json', content: JSON.stringify(inputData) }];
                if (path === '/cache/') return [{ name: 'my_cache.json', content: JSON.stringify(dbData) }];
                return [];
            });

            // Important: Mock readFile to return cached content
            (mockFs.readFile as any).mockImplementation((host: string, path: string, file: string) => {
                 if (path === '/in' && file === 'input.json') return JSON.stringify(inputData);
                 if (path === '/cache/' && file === 'my_cache.json') return JSON.stringify(dbData);
                 return '';
            });

            // Second Run
            await executeMappingTaskRecursive(task, mapping, connections, tables, topics, mockFs, mockDb, {});

            // Verify NO DB Access (should use cache)
            // Note: processLookup logic: if cache file read succeeds, db.select is NOT called.
            expect(mockDb.select).not.toHaveBeenCalled();
            // Verify correct processing
            // We can't easily check output content here without deep inspection of writeFile calls for target,
            // but the absence of db.select proves cache usage.
        });
    });
});
