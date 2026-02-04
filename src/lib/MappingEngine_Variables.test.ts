import { describe, it, expect } from 'vitest';
import { executeMappingTaskRecursive } from './MappingEngine';
import type { Mapping, MappingTask } from './MappingTypes';

describe('Mapping Variables Persistence', () => {
    // Mocks
    const mockFs = {
        listFiles: () => [],
        readFile: () => '',
        deleteFile: () => {},
        writeFile: () => {}
    };
    const mockDb = {
        select: () => [],
        insert: () => {},
        update: () => {},
        delete: () => {}
    };

    it('should persist variable values across executions', async () => {
        // Define Mapping with Variable
        const mapping: Mapping = {
            id: 'm1',
            name: 'VarTest',
            variables: [
                { name: '$$MaxDate', datatype: 'string', aggregationType: 'max', defaultValue: '2000-01-01' }
            ],
            transformations: [
                {
                    id: 'src', type: 'source', name: 'Source',
                    position: { x: 0, y: 0 },
                    config: { connectionId: 'conn1', path: '/', deleteAfterRead: false }
                },
                {
                    id: 'exp', type: 'expression', name: 'Expression',
                    position: { x: 0, y: 0 },
                    config: {
                        fields: [
                            { name: 'v_out', expression: "SETVARIABLE('$$MaxDate', date)" }
                        ]
                    }
                }
            ],
            links: [
                { id: 'l1', sourceId: 'src', targetId: 'exp' }
            ]
        };

        const task: MappingTask = {
            id: 't1', name: 'Task1', mappingId: 'm1', executionInterval: 0, enabled: true
        };

        const conn = { id: 'conn1', name: 'FileConn', type: 'file' as const, host: 'localhost' };

        // Mock File System to return 2 records
        const fsOps = {
            ...mockFs,
            listFiles: () => [{ name: 'input.csv', content: 'date\n2023-01-01\n2023-12-31' }],
            readFile: () => 'date\n2023-01-01\n2023-12-31'
        };

        // First Execution
        const state1 = {};
        const result1 = await executeMappingTaskRecursive(task, mapping, [conn], [], fsOps, mockDb, state1);

        // Verify aggregation (MAX) works
        expect(result1.newState.variables?.['$$MaxDate']).toBe('2023-12-31');

        // Second Execution - Mocking new data that is OLDER than persisted value
        const fsOps2 = {
            ...mockFs,
            listFiles: () => [{ name: 'input2.csv', content: 'date\n2020-01-01' }],
            readFile: () => 'date\n2020-01-01'
        };

        // Pass the newState from previous execution
        const result2 = await executeMappingTaskRecursive(task, mapping, [conn], [], fsOps2, mockDb, result1.newState);

        // Should retain the MAX value from previous execution (2023-12-31 > 2020-01-01)
        expect(result2.newState.variables?.['$$MaxDate']).toBe('2023-12-31');

        // Third Execution - New MAX
        const fsOps3 = {
            ...mockFs,
            listFiles: () => [{ name: 'input3.csv', content: 'date\n2024-01-01' }],
            readFile: () => 'date\n2024-01-01'
        };

        const result3 = await executeMappingTaskRecursive(task, mapping, [conn], [], fsOps3, mockDb, result2.newState);
        expect(result3.newState.variables?.['$$MaxDate']).toBe('2024-01-01');
    });

    it('should handle MIN aggregation type', async () => {
        const mapping: Mapping = {
            id: 'm2', name: 'MinTest',
            variables: [
                { name: '$$MinVal', datatype: 'number', aggregationType: 'min', defaultValue: '100' }
            ],
            transformations: [
                {
                    id: 'src', type: 'source', name: 'Source', position: { x: 0, y: 0 },
                    config: { connectionId: 'conn1' }
                },
                {
                    id: 'exp', type: 'expression', name: 'Expression', position: { x: 0, y: 0 },
                    config: {
                        fields: [
                            { name: 'v_out', expression: "SETVARIABLE('$$MinVal', val)" }
                        ]
                    }
                }
            ],
            links: [{ id: 'l1', sourceId: 'src', targetId: 'exp' }]
        };

        const task: MappingTask = { id: 't2', name: 'Task2', mappingId: 'm2', executionInterval: 0, enabled: true };
        const conn = { id: 'conn1', name: 'FileConn', type: 'file' as const, host: 'localhost' };

        const fsOps = {
            ...mockFs,
            listFiles: () => [{ name: 'input.json', content: JSON.stringify([{ val: 50 }, { val: 200 }]) }],
            readFile: () => JSON.stringify([{ val: 50 }, { val: 200 }])
        };

        const result = await executeMappingTaskRecursive(task, mapping, [conn], [], fsOps, mockDb, {});
        // Should be min(100, 50, 200) -> 50
        expect(result.newState.variables?.['$$MinVal']).toBe(50);
    });
});
