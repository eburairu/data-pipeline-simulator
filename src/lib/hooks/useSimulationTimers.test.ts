// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSimulationTimers } from './useSimulationTimers';
import * as SettingsContext from '../SettingsContext';
import * as VirtualFileSystem from '../VirtualFileSystem';
import * as JobMonitorContext from '../JobMonitorContext';

vi.mock('../SettingsContext');
vi.mock('../VirtualFileSystem');
vi.mock('../JobMonitorContext');

describe('useSimulationTimers', () => {
    const mockWriteFile = vi.fn();
    const mockAddLog = vi.fn().mockReturnValue('log-1');
    const mockUpdateLog = vi.fn();
    const mockEngines = {
        executeCollectionJob: vi.fn(),
        executeDeliveryJob: vi.fn(),
        executeMappingJob: vi.fn(),
        executeTaskFlow: vi.fn(),
        checkTopicRetention: vi.fn(),
    };

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();

        (VirtualFileSystem.useFileSystem as any).mockReturnValue({
            writeFile: mockWriteFile,
            listFiles: vi.fn().mockReturnValue([]),
            readFile: vi.fn(),
            deleteFile: vi.fn(),
            moveFile: vi.fn(),
        });

        (JobMonitorContext.useJobMonitor as any).mockReturnValue({
            addLog: mockAddLog,
            updateLog: mockUpdateLog,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should generate compressed file when compressionActions are set', () => {
        const mockJob = {
            id: 'job-1',
            name: 'Compressed Job',
            enabled: true,
            connectionId: 'conn-1',
            path: '/data',
            fileNamePattern: 'test.txt',
            fileContent: 'hello world',
            mode: 'template',
            executionInterval: 1000,
            compressionActions: ['gz']
        };

        (SettingsContext.useSettings as any).mockReturnValue({
            dataSource: { jobs: [mockJob] },
            connections: [{ id: 'conn-1', type: 'file', host: 'localhost' }],
            collection: { jobs: [] },
            delivery: { jobs: [] },
            mappingTasks: [],
            taskFlows: [],
        });

        renderHook(() => useSimulationTimers(
            { generator: true, archive: false, transfer: false, mapping: false },
            mockEngines as any
        ));

        // Advance timer
        vi.advanceTimersByTime(1000);

        // Verify writeFile was called with compressed content
        expect(mockWriteFile).toHaveBeenCalledWith(
            'localhost',
            '/data',
            'test.txt.gz',
            '[GZ]hello world'
        );
    });

    it('should generate nested archive (tar.gz) when multiple actions are set', () => {
        const mockJob = {
            id: 'job-2',
            name: 'Tar Gz Job',
            enabled: true,
            connectionId: 'conn-1',
            path: '/data',
            fileNamePattern: 'data.csv',
            fileContent: `id,val\n1,a`,
            mode: 'template',
            executionInterval: 500,
            compressionActions: ['tar', 'gz']
        };

        (SettingsContext.useSettings as any).mockReturnValue({
            dataSource: { jobs: [mockJob] },
            connections: [{ id: 'conn-1', type: 'file', host: 'localhost' }],
            collection: { jobs: [] },
            delivery: { jobs: [] },
            mappingTasks: [],
            taskFlows: [],
        });

        renderHook(() => useSimulationTimers(
            { generator: true, archive: false, transfer: false, mapping: false },
            mockEngines as any
        ));

        vi.advanceTimersByTime(500);

        expect(mockWriteFile).toHaveBeenCalled();
        const callArgs = mockWriteFile.mock.calls[0];
        
        // tar.gz
        expect(callArgs[2]).toBe('data.csv.tar.gz');
        // tar wrapped in gz
        expect(callArgs[3]).toMatch(/^\[GZ\]\[TAR:data\.csv\.tar\]--FILE:data\.csv\.tar--/);
    });

    it('should respect execution intervals for multiple jobs', () => {
        const jobs = [
            { id: 'j1', enabled: true, connectionId: 'c1', path: '/', fileNamePattern: 'f1', fileContent: '1', executionInterval: 100, compressionActions: ['gz'] },
            { id: 'j2', enabled: true, connectionId: 'c1', path: '/', fileNamePattern: 'f2', fileContent: '2', executionInterval: 500, compressionActions: [] }
        ];

        (SettingsContext.useSettings as any).mockReturnValue({
            dataSource: { jobs },
            connections: [{ id: 'c1', type: 'file', host: 'h' }],
            collection: { jobs: [] },
            delivery: { jobs: [] },
            mappingTasks: [],
            taskFlows: [],
        });

        renderHook(() => useSimulationTimers(
            { generator: true, archive: false, transfer: false, mapping: false },
            mockEngines as any
        ));

        vi.advanceTimersByTime(300);
        // j1 should have fired 3 times, j2 zero times
        expect(mockWriteFile).toHaveBeenCalledTimes(3);
        expect(mockWriteFile).toHaveBeenCalledWith('h', '/', 'f1.gz', '[GZ]1');

        vi.advanceTimersByTime(200);
        // now j2 should have fired once, and j1 total 5 times
        expect(mockWriteFile).toHaveBeenCalledTimes(6);
        expect(mockWriteFile).toHaveBeenCalledWith('h', '/', 'f2', '2');
    });
});
