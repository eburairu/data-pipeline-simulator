import { useCallback, useRef } from 'react';
import { useFileSystem } from '../VirtualFileSystem';
import { useVirtualDB } from '../VirtualDB';
import { useSettings } from '../SettingsContext';
import { useJobMonitor } from '../JobMonitorContext';
import { processTemplate } from '../templateUtils';
import { executeMappingTaskRecursive, type ExecutionState, type ExecutionStats, type DbRecord } from '../MappingEngine';
import type { DataRow } from '../types';

export const useSimulationEngine = (
    toggleStep: (step: string, active: boolean) => void,
    setErrors: React.Dispatch<React.SetStateAction<string[]>>
) => {
    const { writeFile, moveFile, listFiles, deleteFile } = useFileSystem();
    const { insert, select, update, remove } = useVirtualDB();
    const { connections, collection, delivery, mappings, mappingTasks, taskFlows, tables, topics } = useSettings();
    const { addLog, updateLog } = useJobMonitor();

    const collectionLocks = useRef<Record<string, boolean>>({});
    const deliveryLocks = useRef<Record<string, boolean>>({});
    const mappingStates = useRef<Record<string, ExecutionState>>({});
    const mappingLocks = useRef<Record<string, boolean>>({});
    const fileLocks = useRef<Set<string>>(new Set());
    // executeDeliveryJob への安定した参照（循環依存を回避）
    const executeDeliveryJobRef = useRef<((id: string) => Promise<void>) | undefined>(undefined);

    const getFileLockKey = useCallback((host: string, path: string, fileName: string) => `${host}:${path}/${fileName}`, []);
    const isFileLocked = useCallback((host: string, path: string, fileName: string) => fileLocks.current.has(getFileLockKey(host, path, fileName)), [getFileLockKey]);
    const lockFile = useCallback((host: string, path: string, fileName: string) => fileLocks.current.add(getFileLockKey(host, path, fileName)), [getFileLockKey]);
    const unlockFile = useCallback((host: string, path: string, fileName: string) => fileLocks.current.delete(getFileLockKey(host, path, fileName)), [getFileLockKey]);

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    const calculateProcessingTime = (content: string, bandwidth: number, latency: number) => {
        const safeBandwidth = Math.max(0.1, bandwidth);
        const transferTime = (content.length / safeBandwidth) * 1000;
        return transferTime + latency;
    };

    const checkTopicRetention = useCallback(() => {
        topics.forEach(topic => {
            const topicPath = `/topics/${topic.id}`;
            const files = listFiles('localhost', topicPath);
            const now = Date.now();
            files.forEach(file => {
                if (now - file.createdAt > topic.retentionPeriod) {
                    deleteFile('localhost', file.name, topicPath);
                    // Optional: Log deletion (could be noisy)
                    // console.log(`[Retention] Deleted expired file ${file.name} from topic ${topic.name}`);
                }
            });
        });
    }, [topics, listFiles, deleteFile]);

    const executeCollectionJob = useCallback(async (jobId: string) => {
        const job = collection.jobs.find(j => j.id === jobId);
        if (!job) return;

        const sourceConn = connections.find(c => c.id === job.sourceConnectionId);
        if (!sourceConn || sourceConn.type !== 'file' || !sourceConn.host || !sourceConn.path) {
            setErrors(prev => [...new Set([...prev, `Collection Job ${job.name}: Invalid Source Connection`])]);
            return;
        }
        const sourceHost = sourceConn.host;
        const sourcePath = sourceConn.path;

        let targetHost = '';
        let targetPath = '';

        if (job.targetType === 'topic' && job.targetTopicId) {
            targetHost = 'localhost';
            targetPath = `/topics/${job.targetTopicId}`;
        } else {
            const targetConn = connections.find(c => c.id === job.targetConnectionId);
            if (!targetConn || targetConn.type !== 'file' || !targetConn.host || !targetConn.path) {
                setErrors(prev => [...new Set([...prev, `Collection Job ${job.name}: Invalid Target Connection`])]);
                return;
            }
            targetHost = targetConn.host;
            targetPath = targetConn.path;
        }

        if (collectionLocks.current[job.id]) return;

        try {
            const currentFiles = listFiles(sourceHost, sourcePath);
            if (currentFiles.length === 0) return;

            let regex: RegExp;
            try {
                regex = new RegExp(job.filterRegex);
            } catch {
                setErrors(prev => [...prev, `Collection Job ${job.name}: Invalid Regex`]);
                return;
            }

            const file = currentFiles.find(f => regex.test(f.name) && !isFileLocked(sourceHost, sourcePath, f.name));
            if (!file) return;

            collectionLocks.current[job.id] = true;
            lockFile(sourceHost, sourcePath, file.name);
            toggleStep(`transfer_1_${job.id}`, true);
            const startTime = Date.now();

            const logId = addLog({
                jobId: job.id,
                jobName: job.name,
                jobType: 'collection',
                status: 'running',
                startTime: startTime,
                recordsInput: 1,
                recordsOutput: 0,
                details: `Moving ${file.name}...`
            });

            try {
                const processingTime = calculateProcessingTime(file.content, job.bandwidth, collection.processingTime);
                await delay(processingTime);

                const context = {
                    hostname: sourceHost,
                    timestamp: new Date(),
                    collectionHost: targetHost,
                    fileName: file.name
                };
                const renamePattern = job.renamePattern || '${fileName}';
                const newFileName = processTemplate(renamePattern, context);

                // Check if source file should be deleted after transfer (default: true = move)
                const shouldDeleteSource = job.deleteSourceAfterTransfer !== false;

                if (shouldDeleteSource) {
                    // Move file (delete source after copy)
                    moveFile(file.name, sourceHost, sourcePath, targetHost, targetPath, newFileName);
                } else {
                    // Copy file (keep source)
                    writeFile(targetHost, targetPath, newFileName, file.content);
                }
                setErrors(prev => prev.filter(e => !e.includes(`Collection Job ${job.name}`)));

                updateLog(logId, {
                    status: 'success',
                    endTime: Date.now(),
                    recordsOutput: 1,
                    details: `${shouldDeleteSource ? 'Moved' : 'Copied'} ${file.name} to ${targetHost}:${targetPath}`,
                    extendedDetails: {
                        fileSize: file.content.length,
                        bandwidth: job.bandwidth,
                        throughput: (file.content.length / ((Date.now() - startTime) / 1000))
                    }
                });

                // Trigger Subscriptions
                if (job.targetType === 'topic' && job.targetTopicId && job.triggerSubscriptions) {
                    const subscriberJobs = delivery.jobs.filter(dj => dj.sourceType === 'topic' && dj.sourceTopicId === job.targetTopicId && dj.enabled);
                    subscriberJobs.forEach(dj => {
                        // ref 経由で最新の executeDeliveryJob を呼び出す（循環依存を回避）
                        executeDeliveryJobRef.current?.(dj.id).catch(console.error);
                    });
                }
            } catch {
                const errMsg = `Collection Job ${job.name}: Failed to move to '${targetHost}:${targetPath}'`;
                setErrors(prev => [...new Set([...prev, errMsg])]);
                updateLog(logId, {
                    status: 'failed',
                    endTime: Date.now(),
                    recordsOutput: 0,
                    errorMessage: errMsg,
                    details: `File: ${file.name}`
                });
            } finally {
                unlockFile(sourceHost, sourcePath, file.name);
                toggleStep(`transfer_1_${job.id}`, false);
                collectionLocks.current[job.id] = false;
            }
        } catch {
            collectionLocks.current[job.id] = false;
        }
    }, [collection.jobs, collection.processingTime, connections, listFiles, isFileLocked, lockFile, addLog, toggleStep, moveFile, updateLog, unlockFile, setErrors, delivery.jobs]);

    const executeDeliveryJob = useCallback(async (jobId: string) => {
        const job = delivery.jobs.find(j => j.id === jobId);
        if (!job) return;
        if (deliveryLocks.current[job.id]) return;

        try {
            let sourceHost = '';
            let sourcePath = '';

            if (job.sourceType === 'topic' && job.sourceTopicId) {
                sourceHost = 'localhost';
                sourcePath = `/topics/${job.sourceTopicId}`;
            } else {
                const sourceConn = connections.find(c => c.id === job.sourceConnectionId);
                if (!sourceConn || sourceConn.type !== 'file' || !sourceConn.host || !sourceConn.path) {
                    setErrors(prev => [...new Set([...prev, `Delivery Job ${job.name}: Invalid Source Connection`])]);
                    return;
                }
                sourceHost = sourceConn.host;
                sourcePath = sourceConn.path;
            }

            const targetConn = connections.find(c => c.id === job.targetConnectionId);
            if (!targetConn || targetConn.type !== 'file' || !targetConn.host || !targetConn.path) {
                setErrors(prev => [...new Set([...prev, `Delivery Job ${job.name}: Invalid Target Connection`])]);
                return;
            }
            const targetHost = targetConn.host;
            const targetPath = targetConn.path;

            let currentFiles = listFiles(sourceHost, sourcePath);
            if (currentFiles.length === 0) return;

            if (job.sourceType === 'topic') {
                const processedRecords = select('_sys_subscription_state');
                // jobId でフィルタリングして、このジョブが処理済みのファイルのみをスキップ
                const processedSet = new Set(
                    processedRecords
                        .filter((r) => (r as any).data?.jobId === job.id)
                        .map((r) => (r as any).data?.fileName)
                        .filter(Boolean)
                );
                currentFiles = currentFiles.filter(f => !processedSet.has(f.name));
            }
            if (currentFiles.length === 0) return;

            let regex: RegExp;
            try {
                regex = new RegExp(job.filterRegex);
            } catch {
                setErrors(prev => [...prev, `Delivery Job ${job.name}: Invalid Regex`]);
                return;
            }

            const file = currentFiles.find(f => regex.test(f.name) && !isFileLocked(sourceHost, sourcePath, f.name));
            if (!file) return;

            deliveryLocks.current[job.id] = true;
            lockFile(sourceHost, sourcePath, file.name);
            toggleStep(`transfer_2_${job.id}`, true);
            const startTime = Date.now();

            const logId = addLog({
                jobId: job.id,
                jobName: job.name,
                jobType: 'delivery',
                status: 'running',
                startTime: startTime,
                recordsInput: 1,
                recordsOutput: 0,
                details: `Delivering ${file.name}...`
            });

            try {
                const processingTime = calculateProcessingTime(file.content, job.bandwidth, job.processingTime);
                await delay(processingTime);

                if (job.sourceType === 'topic') {
                    // Topic source always copies (subscription model)
                    writeFile(targetHost, targetPath, file.name, file.content);
                    insert('_sys_subscription_state', { jobId: job.id, fileName: file.name, timestamp: Date.now() });
                } else {
                    // Host source: check if source file should be deleted after transfer (default: true = move)
                    const shouldDeleteSource = job.deleteSourceAfterTransfer !== false;

                    if (shouldDeleteSource) {
                        // Move file (delete source after copy)
                        moveFile(file.name, sourceHost, sourcePath, targetHost, targetPath);
                    } else {
                        // Copy file (keep source)
                        writeFile(targetHost, targetPath, file.name, file.content);
                    }
                }
                setErrors(prev => prev.filter(e => !e.includes(`Delivery Job ${job.name}`)));

                const shouldDeleteSource = job.sourceType === 'topic' ? false : (job.deleteSourceAfterTransfer !== false);
                updateLog(logId, {
                    status: 'success',
                    endTime: Date.now(),
                    recordsOutput: 1,
                    details: `${job.sourceType === 'topic' ? 'Copied' : (shouldDeleteSource ? 'Moved' : 'Copied')} ${file.name} to ${targetHost}:${targetPath}`,
                    extendedDetails: {
                        fileSize: file.content.length,
                        bandwidth: job.bandwidth,
                        throughput: (file.content.length / ((Date.now() - startTime) / 1000))
                    }
                });
            } catch {
                const errMsg = `Delivery Job ${job.name}: Failed to move/copy to '${targetHost}:${targetPath}'`;
                setErrors(prev => [...new Set([...prev, errMsg])]);
                updateLog(logId, {
                    status: 'failed',
                    endTime: Date.now(),
                    recordsOutput: 0,
                    errorMessage: errMsg,
                    details: `File: ${file.name}`
                });
            } finally {
                unlockFile(sourceHost, sourcePath, file.name);
                toggleStep(`transfer_2_${job.id}`, false);
                deliveryLocks.current[job.id] = false;
            }
        } catch {
            deliveryLocks.current[job.id] = false;
        }
    }, [delivery.jobs, connections, listFiles, select, isFileLocked, lockFile, toggleStep, addLog, writeFile, insert, moveFile, updateLog, unlockFile, setErrors]);

    // ref を更新して、executeCollectionJob から最新の executeDeliveryJob を呼び出せるようにする
    executeDeliveryJobRef.current = executeDeliveryJob;

    const executeMappingJob = useCallback(async (taskId: string, parentLogId?: string): Promise<{ input: number, output: number } | null> => {
        const task = mappingTasks.find(t => t.id === taskId);
        if (!task) return null;
        if (mappingLocks.current[task.id]) return null;

        const mapping = mappings.find(m => m.id === task.mappingId);
        if (!mapping) return null;

        const sources = mapping.transformations.filter(t => t.type === 'source');
        if (sources.length === 0) return null;

        mappingLocks.current[task.id] = true;
        toggleStep(`mapping_task_${task.id}`, true);
        const startTime = Date.now();

        const logId = addLog({
            jobId: task.id,
            jobName: task.name,
            jobType: 'mapping',
            status: 'running',
            startTime: startTime,
            recordsInput: 0,
            recordsOutput: 0,
            details: `Initializing mapping ${mapping.name}...`,
            parentLogId: parentLogId
        });

        let resultCounts = { input: 0, output: 0 };

        try {
            if (!mappingStates.current[task.id]) mappingStates.current[task.id] = {};

            const observer = (stats: ExecutionStats) => {
                const totalInput = Object.values(stats.transformations).reduce((acc, s) => acc + s.input, 0);
                const totalOutput = Object.values(stats.transformations).reduce((acc, s) => acc + s.output, 0);
                updateLog(logId, {
                    recordsInput: totalInput,
                    recordsOutput: totalOutput,
                    extendedDetails: stats,
                    details: `Processing... (${totalInput} rows)`
                });
            };

            const { stats, newState } = await executeMappingTaskRecursive(
                task,
                mapping,
                connections,
                tables,
                {
                    listFiles: (h, p) => listFiles(h, p),
                    readFile: (h, p, f) => listFiles(h, p).find(fi => fi.name === f)?.content || '',
                    deleteFile: deleteFile,
                    writeFile: writeFile
                },
                {
                    select: (t) => select(t) as unknown as (DataRow | DbRecord)[],
                    insert,
                    update,
                    delete: remove
                },
                mappingStates.current[task.id],
                observer
            );

            mappingStates.current[task.id] = newState;

            const totalInput = Object.values(stats.transformations).reduce((acc, s) => acc + s.input, 0);
            const totalOutput = Object.values(stats.transformations).reduce((acc, s) => acc + s.output, 0);
            const totalErrors = Object.values(stats.transformations).reduce((acc, s) => acc + s.errors, 0);

            resultCounts = { input: totalInput, output: totalOutput };

            updateLog(logId, {
                status: totalErrors > 0 ? 'failed' : 'success',
                endTime: Date.now(),
                recordsInput: totalInput,
                recordsOutput: totalOutput,
                details: `Processed via mapping ${mapping.name}`,
                errorMessage: totalErrors > 0 ? `${totalErrors} errors occurred` : undefined,
                extendedDetails: stats
            });

            if (totalErrors > 0) {
                setErrors(prev => [...new Set([...prev, `Task ${task.name}: ${totalErrors} errors`])]);
            } else {
                setErrors(prev => prev.filter(e => !e.includes(`Task ${task.name}`)));
                const downstreamTasks = mappingTasks.filter(t => t.dependencies?.includes(taskId));
                downstreamTasks.forEach(t => {
                    setTimeout(() => executeMappingJob(t.id), 500);
                });
            }
            return resultCounts;
        } catch (e) {
            const errMsg = e instanceof Error ? e.message : 'Unknown error';
            updateLog(logId, {
                status: 'failed',
                endTime: Date.now(),
                errorMessage: errMsg,
                details: `Fatal error in mapping execution`
            });
            return null;
        } finally {
            await delay(500);
            toggleStep(`mapping_task_${task.id}`, false);
            mappingLocks.current[task.id] = false;
        }
    }, [mappingTasks, mappings, connections, tables, listFiles, deleteFile, writeFile, select, insert, update, remove, addLog, toggleStep, updateLog, setErrors]);

    const executeTaskFlow = useCallback(async (flowId: string) => {
        const flow = taskFlows.find(f => f.id === flowId);
        if (!flow || !flow.enabled) return;

        toggleStep(`task_flow_${flow.id}`, true);
        const startTime = Date.now();
        const logId = addLog({
            jobId: flow.id,
            jobName: flow.name,
            jobType: 'taskflow',
            status: 'running',
            startTime: startTime,
            recordsInput: 0,
            recordsOutput: 0,
            details: `Starting flow execution (${flow.parallelExecution ? 'Parallel' : 'Sequential'})...`
        });

        let totalInput = 0;
        let totalOutput = 0;

        try {
            if (flow.parallelExecution) {
                const results = await Promise.all(flow.taskIds.map(taskId => executeMappingJob(taskId, logId)));
                results.forEach(r => {
                    if (r) {
                        totalInput += r.input;
                        totalOutput += r.output;
                    }
                });
            } else {
                for (const taskId of flow.taskIds) {
                    const r = await executeMappingJob(taskId, logId);
                    if (r) {
                        totalInput += r.input;
                        totalOutput += r.output;
                        updateLog(logId, {
                            recordsInput: totalInput,
                            recordsOutput: totalOutput,
                            details: `Executing flow... (${totalInput} rows in total so far)`
                        });
                    }
                }
            }

            updateLog(logId, {
                status: 'success',
                endTime: Date.now(),
                recordsInput: totalInput,
                recordsOutput: totalOutput,
                details: `Flow finished successfully. Total: ${totalInput} In / ${totalOutput} Out.`
            });
        } catch (e) {
            updateLog(logId, {
                status: 'failed',
                endTime: Date.now(),
                errorMessage: e instanceof Error ? e.message : 'Unknown error during flow execution'
            });
        } finally {
            toggleStep(`task_flow_${flow.id}`, false);
        }
    }, [taskFlows, toggleStep, addLog, executeMappingJob, updateLog]);

    return {
        executeCollectionJob,
        executeDeliveryJob,
        executeMappingJob,
        executeTaskFlow,
        checkTopicRetention
    };
};
