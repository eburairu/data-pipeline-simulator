# Archive Job Processing Simulation

## Goal
Simulate processing time for archive jobs based on the total size of files being archived. This enhances the realism of the simulation and ensures the "running" state persists long enough for the visualizer to display the animation.

## Current Behavior
- Archive jobs execute synchronously and nearly instantly.
- The "running" state is too short to be perceived in the UI.
- No processing time simulation based on data volume.

## Proposed Changes

### 1. `src/lib/hooks/useSimulationEngine.ts`

Modify `executeArchiveJob` to:

1.  Calculate the total size of files matched by the `filterRegex`.
2.  Calculate a simulated processing time based on this total size and a default bandwidth.
    - Use `EXECUTION_DEFAULTS.BANDWIDTH_KBPS` as the reference speed.
    - Formula: `processingTime = (totalSize / bandwidth) * 1000`.
3.  Inject a `delay(processingTime)` before the actual file writing/deleting occurs.
4.  Ensure `toggleStep` is called with `${STEP_KEYS.ARCHIVE_JOB}_${job.id}`:
    - `true` before the delay.
    - `false` in the `finally` block.
5.  Update the log to include `extendedDetails` with file size and throughput information, consistent with other jobs.

## Verification
- Verify that `Archive` jobs now take time proportional to the number/size of files.
- Verify that the `PipelineFlow` visualizer shows the animated edge during this processing time.
- Verify that the `JobMonitor` shows the job as "Running" for the duration.
