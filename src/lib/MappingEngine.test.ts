
import { executeMappingTaskRecursive, type FileSystemOps, type DbOps, type ExecutionState } from './MappingEngine';
import type { Mapping, MappingTask } from './MappingTypes';
import { describe, test, expect, vi } from 'vitest';

describe('MappingEngine Reject File', () => {
    test('should generate bad file on validation error', async () => {
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
        const validId = 'val1';

        // Setup Mapping
        const mapping: Mapping = {
            id: 'm1',
            name: 'Test Mapping',
            transformations: [
                {
                    id: sourceId,
                    type: 'source',
                    name: 'Source',
                    position: { x: 0, y: 0 },
                    config: { connectionId: 'conn1' }
                },
                {
                    id: validId,
                    type: 'validator',
                    name: 'Validator',
                    position: { x: 100, y: 0 },
                    config: {
                        rules: [{ field: 'age', type: 'number', required: true }],
                        errorBehavior: 'error'
                    }
                }
            ],
            links: [
                { id: 'l1', sourceId: sourceId, targetId: validId }
            ]
        };

        const task: MappingTask = {
            id: 't1',
            name: 'Test Task',
            mappingId: 'm1',
            executionInterval: 1000,
            enabled: true,
            badFileDir: '/bad_files'
        };

        // Mock File Content
        (mockFs.listFiles as any).mockReturnValue([{ name: 'data.csv' }]);
        (mockFs.readFile as any).mockReturnValue('name,age\nalice,not_number\nbob,20');

        // Execute
        const result = await executeMappingTaskRecursive(
            task,
            mapping,
            [{ id: 'conn1', name: 'FileConn', type: 'file', host: 'local', path: '/in' }],
            [],
            mockFs,
            mockDb,
            state
        );

        // Assertions
        expect(result.stats.transformations[validId].errors).toBe(1); // Alice fails
        expect(result.stats.transformations[validId].output).toBe(1); // Bob passes

        expect(mockFs.writeFile).toHaveBeenCalledWith(
            'localhost',
            '/bad_files/',
            expect.stringMatching(/^Bad_Rows_Test_Task_.*\.csv$/),
            expect.stringContaining('Validation failed')
        );

        // Check content of bad file
        const writeCall = (mockFs.writeFile as any).mock.calls[0];
        const content = writeCall[3];
        expect(content).toContain('"alice"');
        expect(content).toContain('"not_number"');
    });

    test('should inject system variables', async () => {
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
        const exprId = 'expr1';

        // Setup Mapping with Expression using SYSDATE
        const mapping: Mapping = {
            id: 'm2',
            name: 'SysVar Mapping',
            transformations: [
                {
                    id: sourceId,
                    type: 'source',
                    name: 'Source',
                    position: { x: 0, y: 0 },
                    config: { connectionId: 'conn1' }
                },
                {
                    id: exprId,
                    type: 'expression',
                    name: 'Expr',
                    position: { x: 100, y: 0 },
                    config: {
                        fields: [
                            { name: 'current_time', expression: 'SYSDATE' }
                        ]
                    }
                }
            ],
            links: [
                { id: 'l1', sourceId: sourceId, targetId: exprId }
            ]
        };

        const task: MappingTask = {
            id: 't2',
            name: 'SysVar Task',
            mappingId: 'm2',
            executionInterval: 1000,
            enabled: true
        };

        // Mock File Content
        (mockFs.listFiles as any).mockReturnValue([{ name: 'data.csv' }]);
        (mockFs.readFile as any).mockReturnValue('id\n1');

        // Execute
        const result = await executeMappingTaskRecursive(
            task,
            mapping,
            [{ id: 'conn1', name: 'FileConn', type: 'file', host: 'local', path: '/in' }],
            [],
            mockFs,
            mockDb,
            state
        );

        expect(result.stats.transformations[exprId].output).toBe(1);
        expect(result.stats.transformations[exprId].errors).toBe(0);
    });

    test('should include transformation names in stats', async () => {
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

        const sourceId = 'src1';
        const mapping: Mapping = {
            id: 'm3',
            name: 'Name Check Mapping',
            transformations: [
                {
                    id: sourceId,
                    type: 'source',
                    name: 'My Source Node',
                    position: { x: 0, y: 0 },
                    config: { connectionId: 'conn1' }
                }
            ],
            links: []
        };
        const task: MappingTask = {
            id: 't3',
            name: 'Name Check Task',
            mappingId: 'm3',
            executionInterval: 1000,
            enabled: true
        };

        // Execute (no files needed if we just check initialization, but let's provide one to run logic)
        (mockFs.listFiles as any).mockReturnValue([]);

        const result = await executeMappingTaskRecursive(
            task,
            mapping,
            [{ id: 'conn1', name: 'FileConn', type: 'file', host: 'local', path: '/in' }],
            [],
            mockFs,
            mockDb,
            state
        );

        // Assertions
        expect(result.stats.transformations[sourceId]).toBeDefined();
        expect(result.stats.transformations[sourceId].name).toBe('My Source Node');
    });
});
