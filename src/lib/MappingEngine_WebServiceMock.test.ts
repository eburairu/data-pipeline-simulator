import { describe, it, expect, vi } from 'vitest';
import { executeMappingTaskRecursive, ExecutionStats, ExecutionState, FileSystemOps, DbOps } from './MappingEngine';
import { Mapping, MappingTask, Transformation, ConnectionDefinition, TableDefinition } from './MappingTypes';

describe('MappingEngine WebService Mock', () => {
    const mockFs: FileSystemOps = {
        listFiles: vi.fn().mockReturnValue([]),
        readFile: vi.fn().mockReturnValue(''),
        deleteFile: vi.fn(),
        writeFile: vi.fn()
    };

    const mockDb: DbOps = {
        select: vi.fn().mockReturnValue([]),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    };

    it('should return mock response if configured', async () => {
        const mockResponse = JSON.stringify([{ id: 1, name: 'Mock User' }]);

        const transformations: Transformation[] = [
            { id: 'src', type: 'source', name: 'Source', position: { x: 0, y: 0 }, config: { connectionId: 'conn1' } },
            {
                id: 'ws',
                type: 'webService',
                name: 'WebService',
                position: { x: 100, y: 0 },
                config: {
                    url: 'http://example.com',
                    method: 'GET',
                    headers: [],
                    mockResponse: mockResponse
                }
            },
            { id: 'tgt', type: 'target', name: 'Target', position: { x: 200, y: 0 }, config: { connectionId: 'conn2' } }
        ];

        const mapping: Mapping = {
            id: 'm1',
            name: 'Test Mapping',
            transformations,
            links: [
                { id: 'l1', sourceId: 'src', targetId: 'ws' },
                { id: 'l2', sourceId: 'ws', targetId: 'tgt' }
            ]
        };

        const task: MappingTask = {
            id: 't1',
            name: 'Test Task',
            mappingId: 'm1',
            executionInterval: 0,
            enabled: true
        };

        const connections: ConnectionDefinition[] = [
            { id: 'conn1', name: 'Source', type: 'file', host: 'localhost', path: '/src' },
            { id: 'conn2', name: 'Target', type: 'file', host: 'localhost', path: '/tgt' }
        ];

        const tables: TableDefinition[] = [];
        const state: ExecutionState = {};

        // Mock source data
        (mockFs.listFiles as any).mockReturnValue([{ name: 'data.json', content: JSON.stringify([{ id: 0 }]) }]);
        (mockFs.readFile as any).mockReturnValue(JSON.stringify([{ id: 0 }]));

        const { stats } = await executeMappingTaskRecursive(
            task,
            mapping,
            connections,
            tables,
            mockFs,
            mockDb,
            state
        );

        // Check if WebService output matches mock response
        // Since we can't easily inspect the batch flow inside, we can assume if it ran without error and produced output, it's likely fine.
        // But better to check stats or use a mock observer if possible.
        // Or check target write.

        expect(stats.transformations['ws'].output).toBe(1); // 1 record from mock

        // Verify mockFs.writeFile was called with the mock data
        const calls = (mockFs.writeFile as any).mock.calls;
        const lastCall = calls[calls.length - 1];
        const writtenContent = JSON.parse(lastCall[3]); // content is 4th arg
        expect(writtenContent).toEqual([{ id: 1, name: 'Mock User' }]);
    });

    it('should substitute parameters in mock response', async () => {
        const mockResponse = JSON.stringify({ id: 2, date: '${SYSDATE}' });

        const transformations: Transformation[] = [
            { id: 'src', type: 'source', name: 'Source', position: { x: 0, y: 0 }, config: { connectionId: 'conn1' } },
            {
                id: 'ws',
                type: 'webService',
                name: 'WebService',
                position: { x: 100, y: 0 },
                config: {
                    url: 'http://example.com',
                    method: 'GET',
                    headers: [],
                    mockResponse: mockResponse
                }
            },
            { id: 'tgt', type: 'target', name: 'Target', position: { x: 200, y: 0 }, config: { connectionId: 'conn2' } }
        ];

        const mapping: Mapping = {
            id: 'm1',
            name: 'Test Mapping',
            transformations,
            links: [
                { id: 'l1', sourceId: 'src', targetId: 'ws' },
                { id: 'l2', sourceId: 'ws', targetId: 'tgt' }
            ]
        };

        const task: MappingTask = {
            id: 't1',
            name: 'Test Task',
            mappingId: 'm1',
            executionInterval: 0,
            enabled: true
        };

        const connections: ConnectionDefinition[] = [
            { id: 'conn1', name: 'Source', type: 'file', host: 'localhost', path: '/src' },
            { id: 'conn2', name: 'Target', type: 'file', host: 'localhost', path: '/tgt' }
        ];

        const tables: TableDefinition[] = [];
        const state: ExecutionState = {};

        // Mock source data
        (mockFs.listFiles as any).mockReturnValue([{ name: 'data.json', content: JSON.stringify([{ id: 0 }]) }]);
        (mockFs.readFile as any).mockReturnValue(JSON.stringify([{ id: 0 }]));

        await executeMappingTaskRecursive(
            task,
            mapping,
            connections,
            tables,
            mockFs,
            mockDb,
            state
        );

        const calls = (mockFs.writeFile as any).mock.calls;
        const lastCall = calls[calls.length - 1];
        const writtenContent = JSON.parse(lastCall[3]);

        expect(writtenContent[0].id).toBe(2);
        expect(writtenContent[0].date).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO Date check
    });
});
