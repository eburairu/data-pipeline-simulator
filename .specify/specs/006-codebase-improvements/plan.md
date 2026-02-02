# Plan: Codebase Improvements and Optimization

## Overview
This plan focuses on addressing technical debt, improving type safety, optimizing performance, and refining the architecture of the Data Pipeline Simulator. Based on a comprehensive codebase investigation, several key areas have been identified for enhancement.

## Goals
1.  **Enhance Type Safety**: Eliminate remaining `any` types, particularly in core logic (`ExpressionFunctions`) and UI components (`App.tsx`), and introduce strict typing for i18n.
2.  **Refactor Architecture**: Decompose the monolithic `App.tsx` into smaller, manageable components and separate concern-heavy logic (like migration) from Contexts.
3.  **Optimize Performance**: Prepare the application for larger datasets by optimizing rendering in `JobMonitor` and `BiDashboard`.
4.  **Standardize UI**: Unify configuration components (`ParamInput`) to reduce duplication.

## Phased Approach

### Phase 1: Type Safety & Core Logic
Focus on the foundational logic that powers the application.
- Refactor `ExpressionFunctions.ts` to use Generics.
- Improve type definitions in `i18n` and Contexts.

### Phase 2: Architectural Decomposition
Break down the largest components to improve maintainability.
- Extract `StorageView` and `DatabaseView` from `App.tsx`.
- Move migration logic out of `DataContext.tsx`.

### Phase 3: UI Standardization & Performance
Improve the user interface code and rendering performance.
- Create a reusable `ParamInput` component.
- Optimize list rendering in Monitor and Dashboard.

## Risks & Mitigation
- **Risk**: Refactoring `App.tsx` might break the interaction between Simulation Manager and UI.
    - **Mitigation**: Ensure strict prop typing and use component tests to verify behavior.
- **Risk**: Changing `ExpressionFunctions` types might affect runtime behavior of user-defined expressions.
    - **Mitigation**: Enhance unit tests for expressions before refactoring.
