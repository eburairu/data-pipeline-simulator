import { useEffect, useRef } from 'react';
import { useSettings } from '../SettingsContext';
import { useFileSystem } from '../VirtualFileSystem';
import { generateDataFromSchema } from '../DataGenerator';
import { processTemplate } from '../templateUtils';
import { TIMEOUTS } from '../constants';
import { applyCompressionActions, bundleTar, compress } from '../ArchiveEngine';

export const useSimulationTimers = (
    isRunning: { generator: boolean; transfer: boolean; mapping: boolean },
    engines: {
        executeCollectionJob: (id: string) => Promise<void>;
        executeDeliveryJob: (id: string) => Promise<void>;
        executeMappingJob: (id: string) => Promise<unknown>;
        executeTaskFlow: (id: string) => Promise<void>;
        checkTopicRetention: () => void;
    }
) => {
    const { dataSource, collection, delivery, mappingTasks, taskFlows, connections } = useSettings();
    const { writeFile, listFiles, deleteFile } = useFileSystem();
    const sequenceStates = useRef<Record<string, Record<string, number>>>({});

    // エンジン関数への安定した参照（タイマーの再設定を防止）
    const enginesRef = useRef(engines);
    enginesRef.current = engines;

    // Generator Timers
    useEffect(() => {
        if (!isRunning.generator) return;
        const timers = dataSource.jobs.map(job => {
            if (!job.enabled) return null;
            const conn = connections.find(c => c.id === job.connectionId);
            if (!conn || conn.type !== 'file' || !conn.host || !job.path) return null;
            
            return setInterval(() => {
                const ctx = { hostname: conn.host, timestamp: new Date() };
                let content = '';
                if (job.mode === 'schema' && job.schema) {
                    const { content: newContent, nextSequenceState } = generateDataFromSchema(
                        job.schema,
                        job.rowCount || 1,
                        ctx,
                        sequenceStates.current[job.id] || {}
                    );
                    content = newContent;
                    sequenceStates.current[job.id] = nextSequenceState;
                } else {
                    content = processTemplate(job.fileContent, ctx);
                }

                let finalContent = content;
                let finalFileName = processTemplate(job.fileNamePattern, ctx);

                if (job.compressionActions && job.compressionActions.length > 0) {
                    const result = applyCompressionActions(finalContent, job.compressionActions, finalFileName);
                    finalContent = result.content;
                    finalFileName = result.finalFilename;
                }

                writeFile(conn.host, job.path, finalFileName, finalContent);
            }, job.executionInterval);
        }).filter(Boolean) as ReturnType<typeof setInterval>[];
        return () => timers.forEach(clearInterval);
    }, [isRunning.generator, dataSource, writeFile, connections]);

    // Archive Timers
    useEffect(() => {
        if (!isRunning.generator || !dataSource.archiveJobs) return;
        const timers = dataSource.archiveJobs.map(job => {
            if (!job.enabled) return null;
            const srcConn = connections.find(c => c.id === job.sourceConnectionId);
            const tgtConn = connections.find(c => c.id === job.targetConnectionId);
            if (!srcConn || !tgtConn || !job.sourcePath || !job.targetPath) return null;

            return setInterval(() => {
                const files = listFiles(srcConn.host, job.sourcePath);
                const regex = new RegExp(job.filterRegex);
                const matchingFiles = files.filter(f => regex.test(f.name));

                if (matchingFiles.length === 0) return;

                const ctx = { hostname: tgtConn.host, timestamp: new Date() };
                let archiveName = processTemplate(job.fileNamePattern, ctx);
                
                let archiveContent = '';
                if (job.format === 'tar') {
                    archiveContent = bundleTar(matchingFiles.map(f => ({ filename: f.name, content: f.content })));
                } else if (job.format === 'gz' || job.format === 'zip') {
                    // If multiple files, we'd normally tar then gz. For simplicity here, 
                    // if gz/zip is selected, we just compress the first file or join them.
                    // But bundleTar is better for multiple files.
                    // Let's assume if it's multiple files and not tar, we still bundle then compress?
                    // Spec says flatten is fine.
                    const bundled = bundleTar(matchingFiles.map(f => ({ filename: f.name, content: f.content })));
                    archiveContent = compress(bundled, job.format, archiveName);
                }

                writeFile(tgtConn.host, job.targetPath, archiveName, archiveContent);

                if (job.deleteSourceAfterArchive) {
                    matchingFiles.forEach(f => deleteFile(srcConn.host, f.name, job.sourcePath));
                }
            }, job.executionInterval);
        }).filter(Boolean) as ReturnType<typeof setInterval>[];
        return () => timers.forEach(clearInterval);
    }, [isRunning.generator, dataSource.archiveJobs, connections, listFiles, writeFile, deleteFile]);

    // Transfer Timers (Collection)
    useEffect(() => {
        if (!isRunning.transfer) return;
        const timers = collection.jobs.map(job => {
            if (!job.enabled) return null;
            return setInterval(() => enginesRef.current.executeCollectionJob(job.id), job.executionInterval);
        }).filter(Boolean) as ReturnType<typeof setInterval>[];
        return () => timers.forEach(clearInterval);
    }, [isRunning.transfer, collection.jobs]);

    // Transfer Timers (Delivery)
    useEffect(() => {
        if (!isRunning.transfer) return;
        const timers = delivery.jobs.map(job => {
            if (!job.enabled) return null;
            return setInterval(() => enginesRef.current.executeDeliveryJob(job.id), job.executionInterval);
        }).filter(Boolean) as ReturnType<typeof setInterval>[];
        return () => timers.forEach(clearInterval);
    }, [isRunning.transfer, delivery.jobs]);

    // Mapping Timers
    useEffect(() => {
        if (!isRunning.mapping) return;
        const timers = mappingTasks.map(task => {
            if (!task.enabled) return null;
            if (task.dependencies && task.dependencies.length > 0) return null;
            if (taskFlows.some(f => f.enabled && f.taskIds.includes(task.id))) return null;

            return setInterval(() => enginesRef.current.executeMappingJob(task.id), task.executionInterval);
        }).filter(Boolean) as ReturnType<typeof setInterval>[];
        return () => timers.forEach(clearInterval);
    }, [isRunning.mapping, mappingTasks, taskFlows]);

    // Task Flow Timers
    useEffect(() => {
        if (!isRunning.mapping) return;
        const timers = taskFlows.map(flow => {
            if (!flow.enabled) return null;
            return setInterval(() => enginesRef.current.executeTaskFlow(flow.id), flow.executionInterval);
        }).filter(Boolean) as ReturnType<typeof setInterval>[];
        return () => timers.forEach(clearInterval);
    }, [isRunning.mapping, taskFlows]);

    // Retention Check Timer (Always active if transfer is active, or independent)
    useEffect(() => {
        // Run retention check every 5 seconds
        const timer = setInterval(() => {
            enginesRef.current.checkTopicRetention();
        }, TIMEOUTS.TOPIC_RETENTION_CHECK);
        return () => clearInterval(timer);
    }, []);
};
