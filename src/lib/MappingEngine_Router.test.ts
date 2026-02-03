import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeMappingTask } from './MappingEngine';
import type { Mapping, MappingTask, Transformation, MappingLink } from './MappingTypes';
import type { ConnectionDefinition, DataRow } from './types';

// Mock dependencies
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

describe('MappingEngine Router', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should route rows to correct groups based on conditions', async () => {
        // Setup Data
        const inputRows: DataRow[] = [
            { id: 1, type: 'A', value: 100 },
            { id: 2, type: 'B', value: 200 },
            { id: 3, type: 'A', value: 300 },
            { id: 4, type: 'C', value: 400 }, // Default
            { id: 5, type: 'B', value: 500 }
        ];

        mockFs.listFiles.mockReturnValue([{ name: 'input.json', content: JSON.stringify(inputRows) }]);
        mockFs.readFile.mockReturnValue(JSON.stringify(inputRows));

        // Transformations
        const transformations: Transformation[] = [
            {
                id: 'source1',
                name: 'Source',
                type: 'source',
                position: { x: 0, y: 0 },
                config: { connectionId: 'conn_source', path: '/in', filenameColumn: 'filename' }
            },
            {
                id: 'router1',
                name: 'Router',
                type: 'router',
                position: { x: 100, y: 0 },
                config: {
                    routes: [
                        { groupName: 'GroupA', condition: "type == 'A'" },
                        { groupName: 'GroupB', condition: "type == 'B'" }
                    ],
                    defaultGroup: 'Default'
                }
            },
            {
                id: 'targetA',
                name: 'Target A',
                type: 'target',
                position: { x: 200, y: -50 },
                config: { connectionId: 'conn_target_a', path: '/out/a' }
            },
            {
                id: 'targetB',
                name: 'Target B',
                type: 'target',
                position: { x: 200, y: 0 },
                config: { connectionId: 'conn_target_b', path: '/out/b' }
            },
            {
                id: 'targetDefault',
                name: 'Target Default',
                type: 'target',
                position: { x: 200, y: 50 },
                config: { connectionId: 'conn_target_default', path: '/out/default' }
            }
        ];

        // Links
        const links: MappingLink[] = [
            { id: 'l1', sourceId: 'source1', targetId: 'router1' },
            { id: 'l2', sourceId: 'router1', targetId: 'targetA', routerGroup: 'GroupA' },
            { id: 'l3', sourceId: 'router1', targetId: 'targetB', routerGroup: 'GroupB' },
            { id: 'l4', sourceId: 'router1', targetId: 'targetDefault', routerGroup: 'Default' } // Explicit default
        ];

        const mapping: Mapping = {
            id: 'map1',
            name: 'Router Test Mapping',
            transformations,
            links
        };

        const task: MappingTask = {
            id: 'task1',
            name: 'Router Task',
            mappingId: 'map1',
            executionInterval: 0,
            enabled: true
        };

        const connections: ConnectionDefinition[] = [
            { id: 'conn_source', name: 'Source', type: 'file', host: 'localhost' },
            { id: 'conn_target_a', name: 'Target A', type: 'file', host: 'localhost' },
            { id: 'conn_target_b', name: 'Target B', type: 'file', host: 'localhost' },
            { id: 'conn_target_default', name: 'Target Default', type: 'file', host: 'localhost' }
        ];

        // Execute
        const { stats } = await executeMappingTask(
            task,
            mapping,
            connections,
            [],
            mockFs,
            mockDb,
            {}
        );

        // Assertions
        expect(stats.transformations['source1'].output).toBe(5);

        // Router stats
        expect(stats.transformations['router1'].input).toBe(5);
        expect(stats.transformations['router1'].output).toBe(5); // Total output

        // Verify file writes
        // Target A should receive rows with type A (id 1, 3)
        const callsA = mockFs.writeFile.mock.calls.filter(call => call[1].includes('/out/a'));
        expect(callsA.length).toBeGreaterThan(0);
        const contentA = JSON.parse(callsA[0][3]);
        expect(contentA).toHaveLength(2);
        expect(contentA.map((r: any) => r.id)).toEqual(expect.arrayContaining([1, 3]));

        // Target B should receive rows with type B (id 2, 5)
        const callsB = mockFs.writeFile.mock.calls.filter(call => call[1].includes('/out/b'));
        expect(callsB.length).toBeGreaterThan(0);
        const contentB = JSON.parse(callsB[0][3]);
        expect(contentB).toHaveLength(2);
        expect(contentB.map((r: any) => r.id)).toEqual(expect.arrayContaining([2, 5]));

        // Target Default should receive rows with type C (id 4)
        const callsDef = mockFs.writeFile.mock.calls.filter(call => call[1].includes('/out/default'));
        expect(callsDef.length).toBeGreaterThan(0);
        const contentDef = JSON.parse(callsDef[0][3]);
        expect(contentDef).toHaveLength(1);
        expect(contentDef[0].id).toBe(4);
    });
});
