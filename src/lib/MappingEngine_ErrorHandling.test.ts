import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { executeMappingTaskRecursive, type FileSystemOps, type DbOps, type ExecutionState } from './MappingEngine';
import { type Mapping, type MappingTask } from './MappingTypes';
import { compress } from './ArchiveEngine';

describe('MappingEngine Error Handling Enhancement', () => {
    const mockFs = {
        listFiles: vi.fn(),
        readFile: vi.fn(),
        deleteFile: vi.fn(),
        writeFile: vi.fn(),
    } as unknown as { [K in keyof FileSystemOps]: Mock & FileSystemOps[K] };

    const mockDb = {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    } as unknown as { [K in keyof DbOps]: Mock & DbOps[K] };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fail when compressed file is read without decompression enabled', async () => {
        const compressedContent = compress('header\nvalue', 'gz', 'test.csv.gz');
        mockFs.listFiles.mockReturnValue([{ name: 'test.csv.gz', isDirectory: false, size: 100, mtime: new Date() }]);
        mockFs.readFile.mockReturnValue(compressedContent);

        const sourceNode: any = {
            id: 'src1',
            name: 'Source',
            type: 'source',
            position: { x: 0, y: 0 },
            config: {
                connectionId: 'conn1',
                path: '/source/test.csv.gz',
                format: 'csv',
                // decompression is intentionally undefined/false
            }
        };

        const mapping: Mapping = {
            id: 'm1',
            name: 'Test Mapping',
            transformations: [sourceNode],
            links: [],
            parameters: {}
        };

        const task: MappingTask = {
            id: 't1',
            jobId: 'j1',
            mappingId: 'm1',
            // @ts-ignore
            mapping,
            status: 'pending'
        };

        const state: ExecutionState = {
            processedCount: 0,
            errorCount: 0,
            startTime: Date.now(),
            stopOnErrors: false
        };

        const connections = [{ id: 'conn1', name: 'File Source', type: 'file', host: 'localhost' }];

        const result = await executeMappingTaskRecursive(
            task,
            mapping,
            connections as any[],
            [], // tables
            [], // topics
            mockFs,
            mockDb,
            state
        );

        // Expectation: Error should be detected
        const totalErrors = Object.values(result.stats.transformations).reduce((acc, t) => acc + t.errors, 0);
        expect(totalErrors).toBeGreaterThan(0);
    });

    it('should fail when no target columns match the input data', async () => {
        // Setup source returning standard data
        mockFs.listFiles.mockReturnValue([{ name: 'data.csv', isDirectory: false, size: 100, mtime: new Date() }]);
        mockFs.readFile.mockReturnValue('colA,colB\nval1,val2');

        const sourceNode: any = {
            id: 'src2',
            name: 'Source',
            type: 'source',
            position: { x: 0, y: 0 },
            config: {
                connectionId: 'conn1',
                path: '/source/data.csv',
                format: 'csv'
            }
        };

        const targetNode: any = {
            id: 'target1',
            name: 'Target Table',
            type: 'target',
            position: { x: 200, y: 0 },
            config: {
                connectionId: 'db_conn',
                tableName: 'target_table',
                destination: 'db_table',
                table: 'target_table'
            }
        };

        const mapping: Mapping = {
            id: 'm2',
            name: 'Test Mapping Column Mismatch',
            transformations: [sourceNode, targetNode],
            links: [{ id: 'l1', sourceId: 'src2', targetId: 'target1' }],
            parameters: {}
        };

        const task: MappingTask = {
            id: 't2',
            jobId: 'j2',
            mappingId: 'm2',
            // @ts-ignore
            mapping,
            status: 'pending'
        };

        // Mock DB schema to have mismatched columns
        // Assuming MappingEngine checks schema or we simulate the insert behavior check
        // Actually MappingEngine.ts might not query schema directly for validation unless we implement it.
        // But the requirement says "when inserting... if no columns match".
        // The current processTarget uses `Object.keys(record)` and tries to match with target columns or just inserts.
        // If it's a VirtualDB, insert(table, row) is called.
        // We need to simulate the check logic inside MappingEngine.
        
        // Let's assume the fix will check keys against something.
        // But wait, standard SQL INSERT doesn't automatically check against schema in this engine unless VirtualDB throws.
        // However, the spec says "Validate column matching".
        // So we expect MappingEngine to detect this *before* insert or catch it.
        // For this test, we assume MappingEngine will look at the target definition or data.
        
        // NOTE: The current engine extracts columns from the *record* itself. 
        // If the record has {colA: val1}, and target expects {colX: val1}, 
        // normally we'd need a transformation. If no transformation, it tries to insert {colA: val1}.
        // If the DB is strict, it fails. If lenient (VirtualDB), it might accept.
        // The requirement is to *enforce* this check in MappingEngine.
        
        // To make this test fail currently (or pass after fix), we need to assert that errorCount increases.
        
        const state: ExecutionState = {
            processedCount: 0,
            errorCount: 0,
            startTime: Date.now(),
            stopOnErrors: false
        };

        // We mock VirtualDB insert to NOT throw, so we can verify MappingEngine catches it.
        mockDb.insert.mockImplementation(() => { /* success */ });
        
        // We also need to provide "target schema" somehow if MappingEngine is to check it.
        // Or, simpler: "If the record has keys A, B and the user mapped nothing or target has X, Y..."
        // The spec says: "Compare record keys with target table columns".
        // VirtualDB mock needs to help or we need to pass schema info.
        // But MappingEngine currently doesn't fetch schema.
        // The spec implies we should probably fetch schema or at least warn if the resulting object is empty?
        // Ah, "record keys ... and target table columns ... match nothing".
        // Currently MappingEngine doesn't know target table columns unless we fetch them.
        
        // Let's adjust expectation: If the engine *cannot* know target columns without fetching,
        // maybe the requirement implies "if the resulting record to insert is empty"? 
        // No, if keys don't match, the record is not empty, just wrong keys.
        
        // Maybe the requirement assumes we *should* fetch schema. 
        // Or maybe for this test, we just check if MappingEngine is modified to do this check.
        // For now, let's write the test assuming we inject the table schema into the mockDb.select or similar,
        // OR MappingEngine will receive the schema.
        
        // Wait, `tables` in App.tsx context are passed to VirtualDB, but MappingEngine receives `dbOps`.
        // `dbOps` has `select`. We might need `getSchema` or similar? 
        // Or we rely on `insert` throwing an error?
        // The spec says "MappingEngine... validates...".
        // Let's assume we will add `getColumns` or similar to DbOps, OR we just check if keys match *mapped* columns?
        // Actually, if we use `automap` or manual map.
        // If manual map is empty, and automap finds nothing.
        
        // Let's simplify: The spec says "Target (DB) writing... validation".
        // If we implement checking against `mockDb` or if we simply check if "mapped record is empty" (if filtering applied)?
        // Re-reading spec: "Compare record keys... and target table columns".
        // So we MUST know target table columns.
        // Currently `DbOps` interface might not expose this. We might need to add `getTableSchema` to `DbOps`.
        
        // For the test, we'll mock `getTableInfo` (which we might need to add).
        // Let's assume we add `getTableColumns` to DbOps.
        (mockDb as any).getTableColumns = vi.fn().mockReturnValue(['colX', 'colY']);

        const connections = [
            { id: 'conn1', name: 'File Source', type: 'file', host: 'localhost' },
            { id: 'db_conn', name: 'DB Target', type: 'database', host: 'localhost' }
        ];
        const tables = [
            { id: 'tbl1', name: 'target_table', columns: [{ name: 'colX', type: 'string' }, { name: 'colY', type: 'string' }] }
        ];

        const result = await executeMappingTaskRecursive(
            task,
            mapping,
            connections as any[],
            tables,
            [], // topics
            mockFs,
            mockDb,
            state
        );

        const totalErrors = Object.values(result.stats.transformations).reduce((acc, t) => acc + t.errors, 0);
        expect(totalErrors).toBeGreaterThan(0);
    });
});
