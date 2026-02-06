
import { executeMappingTaskRecursive, type FileSystemOps, type DbOps, type ExecutionState } from './MappingEngine';
import type { Mapping, MappingTask, TargetTransformation } from './MappingTypes';
import type { TopicDefinition } from './types';
import { describe, test, expect, vi } from 'vitest';

describe('MappingEngine Topic Target', () => {
    // Common Setup
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
    const targetId = 'tgt1';
    const topicId = 'topic1';

    const topics: TopicDefinition[] = [
        {
            id: topicId,
            name: 'TestTopic',
            retentionPeriod: 3600,
            schema: [
                { name: 'id', type: 'number' },
                { name: 'name', type: 'string' }
            ],
            schemaEnforcement: 'strict'
        }
    ];

    const mapping: Mapping = {
        id: 'm1',
        name: 'Topic Mapping',
        transformations: [
            {
                id: sourceId,
                type: 'source',
                name: 'Source',
                position: { x: 0, y: 0 },
                config: { connectionId: 'conn1', path: '/in' }
            },
            {
                id: targetId,
                type: 'target',
                name: 'TopicTarget',
                position: { x: 100, y: 0 },
                config: {
                    targetType: 'topic',
                    topicId: topicId,
                    connectionId: 'dummy' // Should be ignored or optional
                }
            }
        ],
        links: [
            { id: 'l1', sourceId: sourceId, targetId: targetId }
        ]
    };

    const task: MappingTask = {
        id: 't1',
        name: 'Topic Task',
        mappingId: 'm1',
        executionInterval: 1000,
        enabled: true
    };

    test('Strict Mode: should reject invalid schema', async () => {
        vi.clearAllMocks();
        // Mock Input: id is string (invalid for number type), name is missing, extra field present
        (mockFs.listFiles as any).mockReturnValue([{ name: 'data.json' }]);
        (mockFs.readFile as any).mockReturnValue(JSON.stringify([
            { id: "123", extra: "field" }, // String number "123" -> Invalid in strict (must be number)
            { id: 123, name: "valid" } // One valid row
        ]));

        const result = await executeMappingTaskRecursive(
            task,
            mapping,
            [{ id: 'conn1', name: 'FileConn', type: 'file', host: 'local' }],
            [],
            topics,
            mockFs,
            mockDb,
            state
        );

        // Expect 1 error (invalid row) and 1 success
        expect(result.stats.transformations[targetId].rejects).toBe(1);
        expect(result.stats.transformations[targetId].output).toBe(1);

        // Verify File Write
        expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
        const args = (mockFs.writeFile as any).mock.calls[0];
        expect(args[0]).toBe('localhost');
        expect(args[1]).toBe(`/topics/${topicId}/`);
        expect(args[2]).toMatch(/^data_.*\.json$/);

        const content = JSON.parse(args[3]);
        expect(content).toHaveLength(1);
        expect(content[0].id).toBe(123);

        // Verify reject content (simplified check)
        expect(result.stats.rejectRows).toHaveLength(1);
    });

    test('Lenient Mode: should allow type conversion and ignore extras', async () => {
        vi.clearAllMocks();

        // Modify topic to lenient
        const lenientTopics = [{ ...topics[0], schemaEnforcement: 'lenient' as const }];

        (mockFs.listFiles as any).mockReturnValue([{ name: 'data.json' }]);
        (mockFs.readFile as any).mockReturnValue(JSON.stringify([
            { id: "456", name: "converted", extra: "ignored" }, // String number -> converted, extra -> ignored
            { id: null, name: "null_id" } // null id -> null (if allowed? schema didn't say required, so yes)
        ]));

        const result = await executeMappingTaskRecursive(
            task,
            mapping,
            [{ id: 'conn1', name: 'FileConn', type: 'file', host: 'local' }],
            [],
            lenientTopics,
            mockFs,
            mockDb,
            state
        );

        expect(result.stats.transformations[targetId].rejects).toBe(0);
        expect(result.stats.transformations[targetId].output).toBe(2);

        // Verify content
        const writeCall = (mockFs.writeFile as any).mock.calls.find((c: any) => c[1].startsWith('/topics/'));
        const content = JSON.parse(writeCall[3]);

        expect(content[0].id).toBe(456); // Converted
        expect(content[0].extra).toBeUndefined(); // Ignored
        expect(content[1].id).toBeNull(); // Null allowed
    });

    test('Topic Not Found: should error whole batch', async () => {
        vi.clearAllMocks();

        const invalidMapping = { ...mapping };
        invalidMapping.transformations = [...mapping.transformations];
        invalidMapping.transformations[1] = {
            ...mapping.transformations[1],
            type: 'target',
            config: { targetType: 'topic', topicId: 'unknown_topic' }
        } as TargetTransformation;


        (mockFs.listFiles as any).mockReturnValue([{ name: 'data.json' }]);
        (mockFs.readFile as any).mockReturnValue(JSON.stringify([{ id: 1 }]));

        const result = await executeMappingTaskRecursive(
            task,
            invalidMapping,
            [{ id: 'conn1', name: 'FileConn', type: 'file', host: 'local' }],
            [],
            topics,
            mockFs,
            mockDb,
            state
        );

        expect(result.stats.transformations[targetId].errors).toBe(1);
        expect(result.stats.transformations[targetId].output).toBe(0);
    });
});
