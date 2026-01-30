
import { executeMappingTaskRecursive, type FileSystemOps, type DbOps, type ExecutionState } from './MappingEngine';
import type { Mapping, MappingTask } from './MappingTypes';
import { describe, test, expect, vi, beforeEach } from 'vitest';

describe('MappingEngine Advanced Features', () => {
    // Shared Mocks
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

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('should persist sequence values across executions', async () => {
        const sourceId = 'src1';
        const seqId = 'seq1';
        const state: ExecutionState = {};

        const mapping: Mapping = {
            id: 'm_seq',
            name: 'Sequence Mapping',
            transformations: [
                { id: sourceId, type: 'source', name: 'Source', position: { x: 0, y: 0 }, config: { connectionId: 'conn1' } },
                {
                    id: seqId, type: 'sequence', name: 'Seq', position: { x: 100, y: 0 },
                    config: { sequenceField: 'my_id', startValue: 100, incrementBy: 10 }
                }
            ],
            links: [{ id: 'l1', sourceId: sourceId, targetId: seqId }]
        };

        const task: MappingTask = {
            id: 't_seq',
            name: 'Seq Task',
            mappingId: 'm_seq',
            executionInterval: 1000,
            enabled: true
        };

        const connections = [{ id: 'conn1', name: 'FileConn', type: 'file', host: 'local', path: '/in' }];

        // Mock File
        (mockFs.listFiles as any).mockReturnValue([{ name: 'data1.csv' }]);
        (mockFs.readFile as any).mockReturnValue('col1\nA\nB'); // 2 rows

        // First Execution
        const res1 = await executeMappingTaskRecursive(task, mapping, connections as any, [], mockFs, mockDb, state);

        // Expect sequence to start at 100
        // Row 1: 100
        // Row 2: 110
        // Next Value in state: 120
        expect(res1.newState.sequences?.[seqId]).toBe(120);

        // Second Execution
        (mockFs.listFiles as any).mockReturnValue([{ name: 'data2.csv' }]);
        (mockFs.readFile as any).mockReturnValue('col1\nC'); // 1 row

        // Pass newState from first execution
        const res2 = await executeMappingTaskRecursive(task, mapping, connections as any, [], mockFs, mockDb, res1.newState);

        // Expect sequence to continue from 120
        // Row 1: 120
        // Next Value in state: 130
        expect(res2.newState.sequences?.[seqId]).toBe(130);
    });

    test('should execute new expression functions', async () => {
        const sourceId = 'src1';
        const exprId = 'expr1';
        const state: ExecutionState = {};

        const mapping: Mapping = {
            id: 'm_expr',
            name: 'Expr Mapping',
            transformations: [
                { id: sourceId, type: 'source', name: 'Source', position: { x: 0, y: 0 }, config: { connectionId: 'conn1' } },
                {
                    id: exprId, type: 'expression', name: 'Expr', position: { x: 100, y: 0 },
                    config: {
                        fields: [
                            { name: 'b64', expression: "BASE64_ENCODE('Hello')" },
                            { name: 'md5_val', expression: "MD5('Hello')" },
                            { name: 'json_v', expression: "JSON_VALUE('{\"a\": {\"b\": 123}}', 'a.b')" }
                        ]
                    }
                }
            ],
            links: [{ id: 'l1', sourceId: sourceId, targetId: exprId }]
        };

        const task: MappingTask = { id: 't_expr', name: 'Expr Task', mappingId: 'm_expr', executionInterval: 1000, enabled: true };
        const connections = [{ id: 'conn1', name: 'FileConn', type: 'file', host: 'local', path: '/in' }];

        (mockFs.listFiles as any).mockReturnValue([{ name: 'data.csv' }]);
        (mockFs.readFile as any).mockReturnValue('dummy\n1');

        // We need to capture the output batch.
        // traverse is recursive and output is not directly returned by executeMappingTaskRecursive (only stats).
        // However, we can spy on traverse or just check logs?
        // Wait, executeMappingTaskRecursive returns stats, not data.
        // To verify data, we should add a Target node or spy on traverse?
        // Let's add a target node to file and check fs.writeFile

        const targetId = 'tgt1';
        mapping.transformations.push({
            id: targetId, type: 'target', name: 'Target', position: { x: 200, y: 0 },
            config: { connectionId: 'conn_out' }
        });
        mapping.links.push({ id: 'l2', sourceId: exprId, targetId: targetId });
        connections.push({ id: 'conn_out', name: 'OutConn', type: 'file', host: 'local', path: '/out' } as any);

        await executeMappingTaskRecursive(task, mapping, connections as any, [], mockFs, mockDb, state);

        const writeCall = (mockFs.writeFile as any).mock.calls.find((c: any) => c[1] === '/out');
        const content = JSON.parse(writeCall[3]);
        const row = content[0];

        expect(row.b64).toBe(btoa('Hello'));
        expect(row.json_v).toBe(123);
        expect(row.md5_val).not.toBeNull();
        expect(row.md5_val).toMatch(/^[0-9a-f]+$/); // Hex string
    });

    test('should support cached lookup', async () => {
        const sourceId = 'src1';
        const lkpId = 'lkp1';
        const targetId = 'tgt1';
        const state: ExecutionState = {};

        const mapping: Mapping = {
            id: 'm_lkp',
            name: 'LKP Mapping',
            transformations: [
                { id: sourceId, type: 'source', name: 'Source', position: { x: 0, y: 0 }, config: { connectionId: 'conn_src' } },
                {
                    id: lkpId, type: 'lookup', name: 'Lookup', position: { x: 100, y: 0 },
                    config: {
                        connectionId: 'conn_db',
                        lookupKeys: ['id'],
                        referenceKeys: ['user_id'],
                        returnFields: ['email']
                    }
                },
                { id: targetId, type: 'target', name: 'Target', position: { x: 200, y: 0 }, config: { connectionId: 'conn_out' } }
            ],
            links: [
                { id: 'l1', sourceId: sourceId, targetId: lkpId },
                { id: 'l2', sourceId: lkpId, targetId: targetId }
            ]
        };

        const task: MappingTask = { id: 't_lkp', name: 'LKP Task', mappingId: 'm_lkp', executionInterval: 1000, enabled: true };
        const connections = [
            { id: 'conn_src', name: 'Src', type: 'file', host: 'local', path: '/in' },
            { id: 'conn_db', name: 'DB', type: 'database', tableName: 'users' },
            { id: 'conn_out', name: 'Out', type: 'file', host: 'local', path: '/out' }
        ];

        // Mock Source
        (mockFs.listFiles as any).mockReturnValue([{ name: 'input.csv' }]);
        (mockFs.readFile as any).mockReturnValue('id\n101\n102');

        // Mock DB
        (mockDb.select as any).mockReturnValue([
            { id: 'u1', data: { user_id: '101', email: 'alice@example.com' } },
            { id: 'u2', data: { user_id: '102', email: 'bob@example.com' } }
        ]);

        await executeMappingTaskRecursive(task, mapping, connections as any, [], mockFs, mockDb, state);

        // Verify select was called (to build cache)
        expect(mockDb.select).toHaveBeenCalledWith('users');

        // Verify Output
        const writeCall = (mockFs.writeFile as any).mock.calls.find((c: any) => c[1] === '/out');
        const content = JSON.parse(writeCall[3]);

        expect(content).toHaveLength(2);
        expect(content[0].email).toBe('alice@example.com');
        expect(content[1].email).toBe('bob@example.com');
    });
});
