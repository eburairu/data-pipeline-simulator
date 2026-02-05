import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeMappingTask } from './MappingEngine';
import type { Mapping, MappingTask } from './MappingTypes';
import type { TopicDefinition, ConnectionDefinition } from './types';

// Mock dependencies
const mockFs = {
    listFiles: vi.fn(),
    readFile: vi.fn(),
    deleteFile: vi.fn(),
    writeFile: vi.fn(),
};

const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
};

describe('MappingEngine - Topic Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should write data to topic and validate schema', async () => {
        const topicId = 'topic_test';
        const topic: TopicDefinition = {
            id: topicId,
            name: 'TestTopic',
            retentionPeriod: 60000,
            schema: [
                { name: 'id', type: 'number' },
                { name: 'name', type: 'string' }
            ],
            schemaEnforcement: 'strict'
        };

        const task: MappingTask = {
            id: 'task_1',
            name: 'Test Task',
            mappingId: 'map_1',
            executionInterval: 0,
            enabled: true
        };

        const mapping: Mapping = {
            id: 'map_1',
            name: 'Test Mapping',
            transformations: [
                {
                    id: 'src',
                    type: 'source',
                    name: 'Source',
                    position: { x: 0, y: 0 },
                    config: { connectionId: 'conn_1' }
                },
                {
                    id: 'tgt',
                    type: 'target',
                    name: 'Target',
                    position: { x: 100, y: 0 },
                    config: {
                        connectionId: '',
                        targetType: 'topic',
                        topicId: topicId
                    }
                }
            ],
            links: [
                { id: 'link_1', sourceId: 'src', targetId: 'tgt' }
            ]
        };

        const connections: ConnectionDefinition[] = [
            { id: 'conn_1', name: 'SourceConn', type: 'file', host: 'localhost' }
        ];

        // Mock source data
        mockFs.listFiles.mockReturnValue([{ name: 'data.json', content: '' }]);
        mockFs.readFile.mockReturnValue(JSON.stringify([
            { id: 1, name: 'Alice' }, // Valid
            { id: 2, name: 123 },     // Invalid (name should be string)
            { id: 3, name: 'Bob', extra: 'field' } // Invalid (Strict mode)
        ]));

        const { stats } = await executeMappingTask(
            task,
            mapping,
            connections,
            [],
            mockFs,
            mockDb,
            {},
            undefined,
            [topic]
        );

        // Check stats
        // Input: 3 rows
        expect(stats.transformations['src'].input).toBe(3);

        // Target Errors: 2 (Row 2: wrong type, Row 3: extra field in strict mode)
        expect(stats.transformations['tgt'].errors).toBe(2);

        // Target Output: 1 (Row 1)
        expect(stats.transformations['tgt'].output).toBe(1);

        // Check file write
        expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
        const [host, path, filename, content] = mockFs.writeFile.mock.calls[0];
        expect(host).toBe('localhost');
        expect(path).toBe('/topics/topic_test');
        expect(JSON.parse(content)).toHaveLength(1);
        expect(JSON.parse(content)[0].name).toBe('Alice');
    });

    it('should handle missing topic gracefully', async () => {
        const task: MappingTask = {
            id: 'task_2',
            name: 'Test Task 2',
            mappingId: 'map_2',
            executionInterval: 0,
            enabled: true
        };

        const mapping: Mapping = {
            id: 'map_2',
            name: 'Test Mapping 2',
            transformations: [
                {
                    id: 'src',
                    type: 'source',
                    name: 'Source',
                    position: { x: 0, y: 0 },
                    config: { connectionId: 'conn_1' }
                },
                {
                    id: 'tgt',
                    type: 'target',
                    name: 'Target',
                    position: { x: 100, y: 0 },
                    config: {
                        connectionId: '',
                        targetType: 'topic',
                        topicId: 'missing_topic'
                    }
                }
            ],
            links: [
                { id: 'link_1', sourceId: 'src', targetId: 'tgt' }
            ]
        };

        const connections: ConnectionDefinition[] = [
            { id: 'conn_1', name: 'SourceConn', type: 'file', host: 'localhost' }
        ];

        mockFs.listFiles.mockReturnValue([{ name: 'data.json', content: '' }]);
        mockFs.readFile.mockReturnValue(JSON.stringify([{ id: 1 }]));

        const { stats } = await executeMappingTask(
            task,
            mapping,
            connections,
            [],
            mockFs,
            mockDb,
            {},
            undefined,
            [] // No topics
        );

        expect(stats.transformations['tgt'].errors).toBe(1);
        expect(mockFs.writeFile).not.toHaveBeenCalled();
    });
});
