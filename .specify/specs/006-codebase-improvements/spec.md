# Specification: Codebase Improvements

## 1. Type Safety Improvements

### 1.1 ExpressionFunctions Generics
**Current State**: `ExpressionFunctions.ts` uses `any` for arguments and return types (e.g., `IIF(condition: any, trueVal: any, falseVal: any): any`).
**Requirement**:
- Use Generics to enforce type consistency where possible (e.g., `IIF<T>(condition: boolean, trueVal: T, falseVal: T): T`).
- Maintain compatibility with `MappingEngine`'s dynamic evaluation.

### 1.2 i18n Typed Keys
**Current State**: `t(key)` accepts any string, leading to potential runtime errors if keys are missing.
**Requirement**:
- Define a `TranslationKey` type based on the structure of `translations.ts`.
- Update `useTranslation` hook to accept `TranslationKey` instead of string.

## 2. Architectural Refactoring

### 2.1 App.tsx Decomposition
**Current State**: `App.tsx` contains `StorageView` and `DatabaseView` definitions, as well as the main `App` and `SimulationManager` logic.
**Requirement**:
- Extract `StorageView` to `src/components/views/StorageView.tsx`.
- Extract `DatabaseView` to `src/components/views/DatabaseView.tsx`.
- Ensure props are strictly typed (no `any`).

### 2.2 DataContext Migration Logic
**Current State**: `DataContext.tsx` handles legacy data migration within its `useEffect`.
**Requirement**:
- Create `src/lib/migrations/DataMigration.ts`.
- Move migration logic (e.g., updating old job formats) to this new module.
- Call the migration utility from `DataContext` or `SettingsContext` initialization.

## 3. UI Standardization

### 3.1 Unified ParamInput
**Current State**: Multiple settings files (`MappingTaskSettings.tsx`, `DataSourceSettings.tsx`) implement their own key-value pair input fields.
**Requirement**:
- Create `src/components/common/ParamInput.tsx`.
- Standardize props: `value: Record<string, string>`, `onChange: (val: Record<string, string>) => void`, `placeholder?: string`.
- Replace inline implementations in settings components.

## 4. Performance Optimization

### 4.1 Rendering Optimization
**Current State**: Lists in `JobMonitor` and `DatabaseView` render all items.
**Requirement**:
- Implement simple pagination or limit rendering (e.g., show last 100 logs/records) if virtualization is too heavy for now.
- `JobMonitor` already has virtualization potential, ensure it is performant on mobile.
