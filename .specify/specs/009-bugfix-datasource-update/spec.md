# Bug Fix: Data Source Update Logic

## Issue
The "Target Connection" selector in the Data Source Settings was not correctly updating the job configuration. This was due to:
1.  Calling `handleJobChange` (which triggers `setDataSource`) twice in succession within the `onChange` handler.
2.  `handleJobChange` using the current `dataSource` state from the render scope instead of a functional state update, leading to race conditions where one update might overwrite the other.

## Solution
1.  **Atomic Update:** Update the `onChange` handler for the "Target Connection" selector to perform a single atomic state update that modifies both `connectionId` and resets `path`.
2.  **Functional State Update:** Refactor `handleJobChange`, `addJob`, and `removeJob` to use the functional form of `setDataSource` (e.g., `setDataSource(prev => ...)`). This ensures that updates are always applied to the latest state, preventing race conditions.

## Changes
### `src/components/settings/DataSourceSettings.tsx`
- Refactored `handleJobChange` to use `setDataSource(prev => ...)`.
- Refactored `addJob` to use `setDataSource(prev => ...)`.
- Refactored `removeJob` to use `setDataSource(prev => ...)`.
- Updated the `onChange` prop of the "Target Connection" `<select>` element to use `setDataSource(prev => ...)` directly, updating `connectionId` and `path` simultaneously.
