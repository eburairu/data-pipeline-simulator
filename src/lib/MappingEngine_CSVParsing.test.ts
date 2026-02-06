import { executeMappingTaskRecursive, type FileSystemOps, type DbOps, type ExecutionState } from './MappingEngine';
import type { Mapping, MappingTask } from './MappingTypes';
import { describe, test, expect, vi } from 'vitest';

describe('MappingEngine CSV Parsing Error', () => {
    test('should capture CSV parsing errors in stats when processing throws exception', async () => {
        // Setup Mocks
        const mockFs: FileSystemOps = {
            listFiles: vi.fn(),
            readFile: vi.fn(),
            deleteFile: vi.fn(),
            writeFile: vi.fn(),
        };
        const mockDb: DbOps = {
            select: vi.fn(),
            insert: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };
        const state: ExecutionState = {};

        // Mock Data
        const sourceId = 'src1';

        // Setup Mapping
        const mapping: Mapping = {
            id: 'm1',
            name: 'CSV Parse Test Mapping',
            transformations: [
                {
                    id: sourceId,
                    type: 'source',
                    name: 'Source',
                    position: { x: 0, y: 0 },
                    config: { connectionId: 'conn1', path: '/in' }
                }
            ],
            links: []
        };

        const task: MappingTask = {
            id: 't1',
            name: 'CSV Parse Test Task',
            mappingId: 'm1',
            executionInterval: 1000,
            enabled: true,
            badFileDir: '/bad_files'
        };

        // Mock File List
        (mockFs.listFiles as any).mockReturnValue([{ name: 'data.csv' }]);

        // Mock readFile to return an object that throws when accessed/used as string,
        // simulating a catastrophic failure during string manipulation or an invalid return type from FS
        (mockFs.readFile as any).mockReturnValue({
            split: () => { throw new Error('Simulated CSV Parse Error'); }
        });

        // Execute
        const result = await executeMappingTaskRecursive(
            task,
            mapping,
            [{ id: 'conn1', name: 'FileConn', type: 'file', host: 'local' }],
            [],
            [],
            mockFs,
            mockDb,
            state
        );

        // Assertions
        expect(result.stats.transformations[sourceId].errors).toBe(1);
        expect(result.stats.rejectRows).toHaveLength(1);
        expect(result.stats.rejectRows![0].error).toContain('Simulated CSV Parse Error');
        expect(result.stats.rejectRows![0].transformationName).toBe('Source');
    });
});
