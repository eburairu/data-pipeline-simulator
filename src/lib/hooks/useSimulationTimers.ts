import { useEffect, useRef } from 'react';
import { useSettings } from '../SettingsContext';
import { useFileSystem } from '../VirtualFileSystem';
import { generateDataFromSchema } from '../DataGenerator';
import { processTemplate } from '../templateUtils';

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
    const { dataSource, collection, delivery, mappingTasks, taskFlows } = useSettings();
    const { writeFile } = useFileSystem();
    const sequenceStates = useRef<Record<string, Record<string, number>>>({});

    // Generator Timers
    useEffect(() => {
        if (!isRunning.generator) return;
        const timers = dataSource.jobs.map(job => {
            if (!job.enabled) return null;
            const def = dataSource.definitions.find(d => d.id === job.dataSourceId);
            if (!def) return null;
            return setInterval(() => {
                const ctx = { hostname: def.host, timestamp: new Date() };
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
                writeFile(def.host, def.path, processTemplate(job.fileNamePattern, ctx), content);
            }, job.executionInterval);
        }).filter(Boolean) as ReturnType<typeof setInterval>[];
        return () => timers.forEach(clearInterval);
    }, [isRunning.generator, dataSource, writeFile]);

    // Transfer Timers (Collection)
    useEffect(() => {
        if (!isRunning.transfer) return;
        const timers = collection.jobs.map(job => {
            if (!job.enabled) return null;
            return setInterval(() => engines.executeCollectionJob(job.id), job.executionInterval);
        }).filter(Boolean) as ReturnType<typeof setInterval>[];
        return () => timers.forEach(clearInterval);
    }, [isRunning.transfer, collection.jobs, engines.executeCollectionJob]);

    // Transfer Timers (Delivery)
    useEffect(() => {
        if (!isRunning.transfer) return;
        const timers = delivery.jobs.map(job => {
            if (!job.enabled) return null;
            return setInterval(() => engines.executeDeliveryJob(job.id), job.executionInterval);
        }).filter(Boolean) as ReturnType<typeof setInterval>[];
        return () => timers.forEach(clearInterval);
    }, [isRunning.transfer, delivery.jobs, engines.executeDeliveryJob]);

    // Mapping Timers
    useEffect(() => {
        if (!isRunning.mapping) return;
        const timers = mappingTasks.map(task => {
            if (!task.enabled) return null;
            if (task.dependencies && task.dependencies.length > 0) return null;
            if (taskFlows.some(f => f.enabled && f.taskIds.includes(task.id))) return null;

            return setInterval(() => engines.executeMappingJob(task.id), task.executionInterval);
        }).filter(Boolean) as ReturnType<typeof setInterval>[];
        return () => timers.forEach(clearInterval);
    }, [isRunning.mapping, mappingTasks, taskFlows, engines.executeMappingJob]);

    // Task Flow Timers
    useEffect(() => {
        if (!isRunning.mapping) return;
        const timers = taskFlows.map(flow => {
            if (!flow.enabled) return null;
            return setInterval(() => engines.executeTaskFlow(flow.id), flow.executionInterval);
        }).filter(Boolean) as ReturnType<typeof setInterval>[];
        return () => timers.forEach(clearInterval);
    }, [isRunning.mapping, taskFlows, engines.executeTaskFlow]);

    // Retention Check Timer (Always active if transfer is active, or independent)
    useEffect(() => {
        // Run retention check every 5 seconds
        const timer = setInterval(() => {
            engines.checkTopicRetention();
        }, 5000);
        return () => clearInterval(timer);
    }, [engines.checkTopicRetention]);
};
