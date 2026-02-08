import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeMappingTaskRecursive, type FileSystemOps, type DbOps, type ExecutionState } from './MappingEngine';
import { type Mapping, type MappingTask } from './MappingTypes';
import { compress, bundleTar } from './ArchiveEngine';

describe('MappingEngine Compression Integration', () => {
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

    it('should decompress a tar.gz file in Source node and process multiple files', async () => {
        const sourceId = 'src1';
        const targetId = 'tgt1';
        const state: ExecutionState = {};

        const mapping: Mapping = {
            id: 'm_comp',
            name: 'Compression Mapping',
            transformations: [
                {
                    id: sourceId,
                    type: 'source',
                    name: 'Source',
                    position: { x: 0, y: 0 },
                    config: { connectionId: 'conn1', path: '/in', decompression: true }
                },
                {
                    id: targetId,
                    type: 'target',
                    name: 'Target',
                    position: { x: 200, y: 0 },
                    config: { connectionId: 'conn2', path: '/out' }
                }
            ],
            links: [{ id: 'l1', sourceId: sourceId, targetId: targetId }]
        };

        const task: MappingTask = {
            id: 't_comp',
            name: 'Comp Task',
            mappingId: 'm_comp',
            executionInterval: 0,
            enabled: true
        };

        const connections = [
            { id: 'conn1', name: 'In', type: 'file', host: 'local' },
            { id: 'conn2', name: 'Out', type: 'file', host: 'local' }
        ];

        // Prepare compressed content
        // tar containing 2 CSV files, then gzipped
        const csv1 = `id,val\n1,a`;
        const csv2 = `id,val\n2,b`;
        const tarContent = bundleTar([
            { filename: 'f1.csv', content: csv1 },
            { filename: 'f2.csv', content: csv2 }
        ]);
        const gzContent = compress(tarContent, 'gz', 'archive.tar');

        mockFs.listFiles.mockReturnValue([{ name: 'archive.tar.gz' }]);
        mockFs.readFile.mockReturnValue(gzContent);

        const result = await executeMappingTaskRecursive(
            task,
            mapping,
            connections as any,
            [],
            [],
            mockFs,
            mockDb,
            state
        );

        // Expect 2 rows (one from each file in tar)
        expect(result.stats.transformations[sourceId].output).toBe(2);
        
        // Verify output written to target
        expect(mockFs.writeFile).toHaveBeenCalled();
        const callArgs = mockFs.writeFile.mock.calls[0];
        const writtenContent = JSON.parse(callArgs[3]);
        expect(writtenContent).toHaveLength(2);
        expect(writtenContent.find((r: any) => r.val === 'a')).toBeDefined();
        expect(writtenContent.find((r: any) => r.val === 'b')).toBeDefined();
    });

    it('should error when compressed file is found but decompression is disabled', async () => {
        const sourceId = 'src1';
        const mapping: Mapping = {
            id: 'm_err',
            name: 'Error Mapping',
            transformations: [
                {
                    id: sourceId,
                    type: 'source',
                    name: 'Source',
                    position: { x: 0, y: 0 },
                    config: { connectionId: 'conn1', path: '/in', decompression: false }
                }
            ],
            links: []
        };

        const task: MappingTask = { id: 't_err', name: 'Error Task', mappingId: 'm_err', executionInterval: 0, enabled: true };
        const connections = [{ id: 'conn1', name: 'In', type: 'file', host: 'local' }];

        mockFs.listFiles.mockReturnValue([{ name: 'data.gz' }]);
        mockFs.readFile.mockReturnValue('[GZ]raw data');

        const result = await executeMappingTaskRecursive(task, mapping, connections as any, [], [], mockFs, mockDb, {});

        expect(result.stats.transformations[sourceId].errors).toBe(1);
        expect(result.stats.rejectRows?.[0].error).toContain('decompression is disabled');
    });

    it('should compress output in Target node', async () => {
        const sourceId = 'src1';
        const targetId = 'tgt1';
        const mapping: Mapping = {
            id: 'm_out',
            name: 'Output Compression',
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
                    name: 'Target',
                    position: { x: 200, y: 0 },
                    config: { 
                        connectionId: 'conn2', 
                        path: '/out',
                        compressionActions: ['tar', 'gz']
                    }
                }
            ],
            links: [{ id: 'l1', sourceId: sourceId, targetId: targetId }]
        };

        const task: MappingTask = { id: 't_out', name: 'Out Task', mappingId: 'm_out', executionInterval: 0, enabled: true };
        const connections = [
            { id: 'conn1', name: 'In', type: 'file', host: 'local' },
            { id: 'conn2', name: 'Out', type: 'file', host: 'local' }
        ];

        mockFs.listFiles.mockReturnValue([{ name: 'data.csv' }]);
        mockFs.readFile.mockReturnValue(`id\n1`);

        await executeMappingTaskRecursive(task, mapping, connections as any, [], [], mockFs, mockDb, {});

        expect(mockFs.writeFile).toHaveBeenCalled();
        const callArgs = mockFs.writeFile.mock.calls[0];
        const filename = callArgs[2];
        const content = callArgs[3];

        expect(filename).toMatch(/\.tar\.gz$/);
        expect(content.startsWith('[GZ][TAR:')).toBe(true);
    });

    it('should handle zip format in Source and Target', async () => {
        const sourceId = 'src1';
        const targetId = 'tgt1';
        const mapping: Mapping = {
            id: 'm_zip',
            name: 'Zip Mapping',
            transformations: [
                {
                    id: sourceId,
                    type: 'source',
                    name: 'Source',
                    position: { x: 0, y: 0 },
                    config: { connectionId: 'conn1', path: '/in', decompression: true }
                },
                {
                    id: targetId,
                    type: 'target',
                    name: 'Target',
                    position: { x: 200, y: 0 },
                    config: { connectionId: 'conn2', path: '/out', compressionActions: ['zip'] }
                }
            ],
            links: [{ id: 'l1', sourceId: sourceId, targetId: targetId }]
        };

        const task: MappingTask = { id: 't_zip', name: 'Zip Task', mappingId: 'm_zip', executionInterval: 0, enabled: true };
        const connections = [
            { id: 'conn1', name: 'In', type: 'file', host: 'local' },
            { id: 'conn2', name: 'Out', type: 'file', host: 'local' }
        ];

        mockFs.listFiles.mockReturnValue([{ name: 'input.zip' }]);
        mockFs.readFile.mockReturnValue(`[ZIP]id\n100`);

        await executeMappingTaskRecursive(task, mapping, connections as any, [], [], mockFs, mockDb, {});

        expect(mockFs.writeFile).toHaveBeenCalled();
        const callArgs = mockFs.writeFile.mock.calls[0];
        expect(callArgs[2]).toMatch(/\.zip$/);
        expect(callArgs[3]).toMatch(/^\[ZIP\]/);
    });

    it('should preserve the source filename in a dedicated column when extracting from archive', async () => {
        const sourceId = 'src1';
        const targetId = 'tgt1';
        const mapping: Mapping = {
            id: 'm_fn',
            name: 'Filename Preservation',
            transformations: [
                {
                    id: sourceId,
                    type: 'source',
                    name: 'Source',
                    position: { x: 0, y: 0 },
                    config: { 
                        connectionId: 'conn1', 
                        path: '/in', 
                        decompression: true,
                        filenameColumn: 'original_file'
                    }
                },
                {
                    id: targetId,
                    type: 'target',
                    name: 'Target',
                    position: { x: 200, y: 0 },
                    config: { connectionId: 'conn2', path: '/out' }
                }
            ],
            links: [{ id: 'l1', sourceId: sourceId, targetId: targetId }]
        };

        const task: MappingTask = { id: 't_fn', name: 'FN Task', mappingId: 'm_fn', executionInterval: 0, enabled: true };
        const connections = [
            { id: 'conn1', name: 'In', type: 'file', host: 'local' },
            { id: 'conn2', name: 'Out', type: 'file', host: 'local' }
        ];

        const tarContent = bundleTar([
            { filename: 'nested_data.csv', content: 'id,val\n101,nested' }
        ]);

        mockFs.listFiles.mockReturnValue([{ name: 'outer.tar' }]);
        mockFs.readFile.mockReturnValue(tarContent);

        await executeMappingTaskRecursive(task, mapping, connections as any, [], [], mockFs, mockDb, {});

        expect(mockFs.writeFile).toHaveBeenCalled();
        const callArgs = mockFs.writeFile.mock.calls[0];
        const content = JSON.parse(callArgs[3]);
        
        expect(content[0].original_file).toBe('nested_data.csv');
        expect(content[0].val).toBe('nested');
    });

    it('should extract and parse mixed CSV and JSON files from a single TAR archive', async () => {
        const sourceId = 'src1';
        const targetId = 'tgt1';
        const mapping: Mapping = {
            id: 'm_mix',
            name: 'Mixed Format Mapping',
            transformations: [
                {
                    id: sourceId,
                    type: 'source',
                    name: 'Source',
                    position: { x: 0, y: 0 },
                    config: { connectionId: 'conn1', path: '/in', decompression: true }
                },
                {
                    id: targetId,
                    type: 'target',
                    name: 'Target',
                    position: { x: 200, y: 0 },
                    config: { connectionId: 'conn2', path: '/out' }
                }
            ],
            links: [{ id: 'l1', sourceId: sourceId, targetId: targetId }]
        };

        const task: MappingTask = { id: 't_mix', name: 'Mix Task', mappingId: 'm_mix', executionInterval: 0, enabled: true };
        const connections = [
            { id: 'conn1', name: 'In', type: 'file', host: 'local' },
            { id: 'conn2', name: 'Out', type: 'file', host: 'local' }
        ];

        const csvContent = 'id,type\n1,csv';
        const jsonContent = JSON.stringify({ id: 2, type: 'json' });
        const tarContent = bundleTar([
            { filename: 'data.csv', content: csvContent },
            { filename: 'data.json', content: jsonContent }
        ]);

        mockFs.listFiles.mockReturnValue([{ name: 'mixed.tar' }]);
        mockFs.readFile.mockReturnValue(tarContent);

        await executeMappingTaskRecursive(task, mapping, connections as any, [], [], mockFs, mockDb, {});

        expect(mockFs.writeFile).toHaveBeenCalled();
        const callArgs = mockFs.writeFile.mock.calls[0];
        const content = JSON.parse(callArgs[3]);
        
        expect(content).toHaveLength(2);
        expect(content.find((r: any) => r.type === 'csv')).toBeDefined();
        expect(content.find((r: any) => r.type === 'json')).toBeDefined();
    });
});
