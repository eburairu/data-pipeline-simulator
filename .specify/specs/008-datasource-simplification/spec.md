# Data Source Settings Simplification

## Objective
Simplify the Data Source configuration by removing the explicit "Data Source Locations" definitions and instead leveraging existing "File" type Connections for Data Generation Jobs.

## Changes

### 1. Data Model Changes (`src/lib/types.ts`)
- **Remove** `DataSourceDefinition` interface.
- **Update** `DataSourceSettings` interface to remove `definitions`.
- **Update** `GenerationJob` interface:
  - Remove `dataSourceId`.
  - Add `connectionId` (string) - References a `ConnectionDefinition` of type 'file'.
  - Add `path` (string) - The target directory path on the host associated with the connection.

### 2. UI Changes (`src/components/settings/DataSourceSettings.tsx`)
- **Remove** "Data Source Locations" section entirely.
- **Update** "File Generation Jobs" section:
  - "Target Location" selector should now list available `Connection`s of type `file`.
  - Add a new "Path" selector that lists directories available on the Host associated with the selected Connection.

### 3. Validation Logic (`src/lib/validation.ts`)
- **Remove** `validateDataSourceDefinition`.
- **Update** `validateGenerationJob` to validate `connectionId` and `path` instead of `dataSourceId`.

### 4. Logic & State Management (`src/lib/SettingsContext.tsx` & others)
- **Update** `SettingsContext` to reflect the removal of `definitions` from `dataSource` state.
- **Update** default/initial state for `dataSource`.
- **Migrate** or **Reset** existing settings logic where necessary (assumed reset or manual update for this task).

## Implementation Steps
1.  Modify `src/lib/types.ts` to update interfaces.
2.  Modify `src/lib/SettingsContext.tsx` to update initial state and context logic.
3.  Modify `src/lib/validation.ts` to update validation rules.
4.  Modify `src/components/settings/DataSourceSettings.tsx` to reflect UI changes.
5.  Verify changes by running the application.
