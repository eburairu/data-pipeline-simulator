import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeMappingTask } from './MappingEngine';
import { type Mapping, type MappingTask, type Transformation, type SourceConfig, type WebServiceConfig, type SqlConfig, type TargetConfig } from './MappingTypes';
import { type ConnectionDefinition, type TableDefinition, type TopicDefinition } from './types';

describe('MappingEngine New Features', () => {
    const mockTables: TableDefinition[] = [];
    const mockTopics: TopicDefinition[] = [];

    const mockFs = {
        listFiles: vi.fn(),
        readFile: vi.fn(),
        deleteFile: vi.fn(),
        writeFile: vi.fn()
    };
    const mockDb = {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should parse Hierarchy JSON', async () => {
         const mapping: Mapping = {
            id: 'm_hp', name: 'HP Test',
            transformations: [
                { id: 't_src', type: 'source', name: 'Source', position: { x: 0, y: 0 }, config: { connectionId: 'c1', path: '/in' } as SourceConfig } as Transformation,
                {
                    id: 't_hp', type: 'hierarchyParser', name: 'Parse JSON', position: { x: 0, y: 0 },
                    config: {
                        inputField: 'jsonData',
                        outputFields: [
                            { path: 'items[0].id', name: 'firstItemId', type: 'number' },
                            { path: 'meta.version', name: 'version', type: 'string' }
                        ]
                    }
                } as Transformation,
                { id: 't_tgt', type: 'target', name: 'Target', position: { x: 0, y: 0 }, config: { connectionId: 'c2', path: '/out' } as TargetConfig } as Transformation
            ],
            links: [
                { id: 'l1', sourceId: 't_src', targetId: 't_hp' } as any,
                { id: 'l2', sourceId: 't_hp', targetId: 't_tgt' } as any
            ]
        };

        const task: MappingTask = { id: 'mt_hp', name: 'HP Task', mappingId: 'm_hp', executionInterval: 0, enabled: true };
        const inputRow = { jsonData: JSON.stringify({ items: [{ id: 100 }, { id: 200 }], meta: { version: '1.0' } }) };

        mockFs.listFiles.mockReturnValue([{ name: 'data.json' }]);
        mockFs.readFile.mockReturnValue(JSON.stringify([inputRow]));

        const conns = [
            { id: 'c1', name: 'Conn1', type: 'file', host: 'h1' } as ConnectionDefinition,
            { id: 'c2', name: 'Conn2', type: 'file', host: 'h1' } as ConnectionDefinition
        ];

        const { stats } = await executeMappingTask(task, mapping, conns, mockTables, mockTopics, mockFs, mockDb, {});

        expect(stats.transformations['t_hp'].output).toBe(1);

        expect(mockFs.writeFile).toHaveBeenCalled();
        const writeCall = mockFs.writeFile.mock.calls.find(c => c[1].includes('/out'));
        if (writeCall) {
            const content = JSON.parse(writeCall[3]);
            expect(content[0].firstItemId).toBe(100);
            expect(content[0].version).toBe('1.0');
        }
    });

    it('should use configured mock response for WebService with parameter substitution', async () => {
        const mapping: Mapping = {
            id: 'm_ws_mock', name: 'WS Mock Test',
            transformations: [
                {
                    id: 't_src', type: 'source', name: 'Source', position: { x: 0, y: 0 },
                    config: { connectionId: 'c1', path: '/in' } as SourceConfig
                } as Transformation,
                {
                    id: 't_ws', type: 'webService', name: 'Get User Mock', position: { x: 0, y: 0 },
                    config: {
                        url: 'http://api.example.com/users',
                        method: 'GET',
                        headers: [],
                        mockResponse: '{"id": "{id}", "name": "Mock User {id}", "role": "${ROLE}"}'
                    } as WebServiceConfig
                } as Transformation,
                 {
                    id: 't_tgt', type: 'target', name: 'Target', position: { x: 0, y: 0 },
                    config: { connectionId: 'c1', path: '/out' } as TargetConfig
                } as Transformation
            ],
            links: [
                { id: 'l1', sourceId: 't_src', targetId: 't_ws' } as any,
                { id: 'l2', sourceId: 't_ws', targetId: 't_tgt' } as any
            ]
        };

        const task: MappingTask = {
            id: 'mt_ws_mock', name: 'WS Mock Task', mappingId: 'm_ws_mock', executionInterval: 0, enabled: true,
            parameters: { 'ROLE': 'Admin' }
        };

        mockFs.listFiles.mockReturnValue([{ name: 'users.csv' }]);
        mockFs.readFile.mockReturnValue('id\n101\n102');

        const conns: ConnectionDefinition[] = [{ id: 'c1', name: 'Conn1', type: 'file', host: 'h1' }];

        await executeMappingTask(task, mapping, conns, mockTables, mockTopics, mockFs, mockDb, {});

        const writeCall = mockFs.writeFile.mock.calls.find(c => c[1].includes('/out'));
        expect(writeCall).toBeDefined();
        if (writeCall) {
            const content = JSON.parse(writeCall[3]);
            expect(content).toHaveLength(2);
            expect(content[0].name).toBe('Mock User 101');
            expect(content[0].role).toBe('Admin');
            expect(content[1].name).toBe('Mock User 102');
            expect(content[1].role).toBe('Admin');
        }
    });

    it('should use configured mock result for SQL', async () => {
        const mapping: Mapping = {
            id: 'm_sql_mock', name: 'SQL Mock Test',
            transformations: [
                {
                    id: 't_src', type: 'source', name: 'Source', position: { x: 0, y: 0 },
                    config: { connectionId: 'c1', path: '/in' } as SourceConfig
                } as Transformation,
                {
                    id: 't_sql', type: 'sql', name: 'SQL Mock', position: { x: 0, y: 0 },
                    config: {
                        sqlQuery: 'SELECT ...',
                        mode: 'query',
                        mockResult: '[{"status": "active"}, {"status": "pending"}]'
                    } as SqlConfig
                } as Transformation,
                 {
                    id: 't_tgt', type: 'target', name: 'Target', position: { x: 0, y: 0 },
                    config: { connectionId: 'c1', path: '/out' } as TargetConfig
                } as Transformation
            ],
            links: [
                { id: 'l1', sourceId: 't_src', targetId: 't_sql' } as any,
                { id: 'l2', sourceId: 't_sql', targetId: 't_tgt' } as any
            ]
        };

        const task: MappingTask = { id: 'mt_sql_mock', name: 'SQL Mock Task', mappingId: 'm_sql_mock', executionInterval: 0, enabled: true };

        mockFs.listFiles.mockReturnValue([{ name: 'data.csv' }]);
        mockFs.readFile.mockReturnValue('id\n1');

        const conns: ConnectionDefinition[] = [{ id: 'c1', name: 'Conn1', type: 'file', host: 'h1' }];

        await executeMappingTask(task, mapping, conns, mockTables, mockTopics, mockFs, mockDb, {});

        const writeCall = mockFs.writeFile.mock.calls.find(c => c[1].includes('/out'));
        expect(writeCall).toBeDefined();
        if (writeCall) {
            const content = JSON.parse(writeCall[3]);
            expect(content).toHaveLength(2);
            expect(content[0].status).toBe('active');
            expect(content[0].id).toBe('1');
            expect(content[1].status).toBe('pending');
            expect(content[1].id).toBe('1');
        }
    });
});
