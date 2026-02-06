import { useEffect, useRef } from 'react';
import { useSettings } from '../SettingsContext';
import { useFileSystem } from '../VirtualFileSystem';
import { generateDataFromSchema } from '../DataGenerator';
import { processTemplate } from '../templateUtils';
import { TIMEOUTS } from '../constants';

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
    const { writeFile } = useFileSystem();
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
                writeFile(conn.host, job.path, processTemplate(job.fileNamePattern, ctx), content);
            }, job.executionInterval);
        }).filter(Boolean) as ReturnType<typeof setInterval>[];
        return () => timers.forEach(clearInterval);
    }, [isRunning.generator, dataSource, writeFile, connections]);

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
