# Spec: 005-system-refactoring - System-wide Refactoring and Optimization

## Status
- Status: Completed
- Priority: High
- Category: Refactoring, Type Safety, Performance

## Context
The current codebase has several technical debts:
- Excessive use of `any` types.
- A bloated `SimulationManager` component in `App.tsx`.
- React purity violations (impure functions in render).
- Missing optimization for re-renders.
- Inconsistent error handling.

## Requirements

### 1. Type Safety (Zero `any` Policy)
- Define strict interfaces for all data structures in `src/lib/types.ts` and `src/lib/MappingTypes.ts`.
- Replace all `any` occurrences in `MappingEngine.ts`, `SettingsContext.tsx`, and other core files.
- Use generics and type guards where appropriate.

### 2. Logic Extraction (Custom Hooks)
- Extract simulation execution logic from `App.tsx` into `src/lib/hooks/useSimulationEngine.ts`.
- Extract timer/interval management into `src/lib/hooks/useSimulationTimers.ts`.
- Simplify `SimulationManager` to only handle high-level coordination and UI.

### 3. React Best Practices & Purity
- Eliminate `Date.now()` and other impure calls within the render path.
- Fix `useEffect` dependency arrays.
- Avoid synchronous `setState` inside `useEffect` (use state initialization or separate logic).
- Implement `React.memo`, `useMemo`, and `useCallback` strategically.

### 4. Component Modularization
- Create a set of shared UI components in `src/components/common/`.
- Refactor `SettingsPanel` and its sub-components to reduce prop drilling and logic coupling.

### 5. Advanced Error Handling
- Implement a global `ErrorBoundary`.
- Enhance the logging system to capture structured error details.

## Success Criteria
- `npm run build` and `npm run lint` pass with zero errors and minimal warnings.
- The application remains fully functional with improved performance and maintainability.
- Code complexity (especially in `App.tsx`) is significantly reduced.
