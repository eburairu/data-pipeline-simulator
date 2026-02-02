---
description: "Tasks for system-wide refactoring and type safety"
---

# Tasks: 005-system-refactoring

**Input**: Design documents from `.specify/specs/005-system-refactoring/`
**Prerequisites**: plan.md, spec.md

## Phase 1: Setup

**Purpose**: Verify environment and tools

- [x] T001 Verify linting configuration and current error count

## Phase 2: Foundational (Type Safety & Context)

**Purpose**: Establish strict type definitions and fix core contexts.

- [x] T002 [P] Define strict interfaces for `DataRow`, `Schema`, `FieldDefinition` in `src/lib/types.ts`
- [x] T003 [P] Consolidate and refine mapping types in `src/lib/MappingTypes.ts`
- [x] T004 [US1] Refactor `src/lib/SettingsContext.tsx` to remove `any` and use defined types

## Phase 3: Core Logic Refactoring (Zero Any)

**Purpose**: Remove `any` from the mapping engine and core logic.

- [x] T005 [US1] Refactor `evaluateExpression` in `src/lib/MappingEngine.ts` to use strict types
- [x] T006 [US1] Refactor recursive mapping logic in `src/lib/MappingEngine.ts` to use strict types
- [x] T007 [US1] Update `src/lib/DataGenerator.ts` to use new type definitions
- [x] T008 [US1] Update `src/lib/Validation.ts` to use new type definitions

## Phase 4: Hooks Extraction & Logic Separation

**Purpose**: Separate logic from UI components.

- [x] T009 [US2] Create `src/lib/hooks/useSimulationTimers.ts` for timer management
- [x] T010 [US2] Refactor `src/lib/hooks/useSimulationEngine.ts` to use strict types and improve state management

## Phase 5: Component Modularization

**Purpose**: Clean up App.tsx and modularize UI.

- [x] T011 [US3] Extract `DatabaseView` logic into `src/components/views/DatabaseView.tsx` (new file)
- [x] T012 [US3] Extract `StorageViews` logic into `src/components/views/StorageViews.tsx` (new file)
- [x] T013 [US3] Clean up `src/App.tsx` to use extracted components and hooks

## Phase 6: Polish & Verification

**Purpose**: Ensure quality and stability.

- [x] T014 Run full type check (`tsc`) and ensure zero errors
- [x] T015 Run lint check (`npm run lint`) and fix remaining warnings
- [x] T016 Verify application functionality (manual test)

## Dependencies & Execution Order

- **Phase 2** blocks everything else. `SettingsContext` is used everywhere.
- **Phase 3** depends on Phase 2.
- **Phase 4 & 5** can be done in parallel after Phase 2, but Phase 3 is recommended before complex UI refactoring.
