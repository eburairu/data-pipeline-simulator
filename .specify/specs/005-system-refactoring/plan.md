# Implementation Plan: 005-system-refactoring

**Branch**: `feature/system-refactoring` | **Date**: 2026-02-02 | **Spec**: [.specify/specs/005-system-refactoring/spec.md](.specify/specs/005-system-refactoring/spec.md)
**Input**: Feature specification from `.specify/specs/005-system-refactoring/spec.md`

## Summary

This refactoring initiative aims to eliminate technical debt identified in the `data-pipeline-simulator` project. The primary focus is on enforcing a "Zero any Policy" for strict type safety, extracting complex simulation logic from `App.tsx` into custom hooks (`useSimulationEngine`, `useSimulationTimers`), and improving React rendering performance and component modularity.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: React 18, Vite
**Storage**: LocalStorage (via VirtualFileSystem/VirtualDB)
**Testing**: Vitest, React Testing Library
**Target Platform**: Web Browser (SPA)
**Project Type**: Single Page Application (Web)
**Performance Goals**: Smooth simulation updates (60fps UI), efficient handling of large data batches.
**Constraints**: Must maintain existing functionality while refactoring.
**Scale/Scope**: ~30 core files, ~110 'any' types to resolve.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Complexity**: The refactoring reduces complexity by decoupling logic from UI.
- **Dependencies**: No new major dependencies introduced.
- **Standards**: Enforces strict TypeScript usage.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/005-system-refactoring/
├── plan.md              # This file
├── spec.md              # Input specification
└── tasks.md             # To be created
```

### Source Code (repository root)

```text
src/
├── App.tsx                    # To be simplified
├── components/
│   ├── common/                # Shared UI components (new/refactored)
│   ├── views/                 # New directory for page/view components (e.g. DatabaseView)
│   └── ...
├── lib/
│   ├── hooks/                 # Logic extraction targets
│   │   ├── useSimulationEngine.ts
│   │   └── useSimulationTimers.ts
│   ├── types.ts               # Core type definitions
│   ├── MappingTypes.ts        # Mapping specific types
│   ├── SettingsContext.tsx    # Context refactoring target
│   └── MappingEngine.ts       # Logic refactoring target
└── ...
```

**Structure Decision**: Maintain the existing Vite/React structure but enforce better separation of concerns by moving logic to `hooks/` and sub-components to `components/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (None) | | |
