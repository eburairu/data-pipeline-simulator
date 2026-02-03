# CLAUDE.md - AI Assistant Guidelines for Data Pipeline Simulator

This document provides essential context for AI assistants (Claude Code, etc.) working on this codebase.

## Project Overview

Data Pipeline Simulator is a React-based web application that simulates ETL (Extract-Transform-Load) data pipelines. It provides visual simulation of data generation, collection, transformation (via mapping engine), and delivery workflows.

**Version**: 1.1.0
**Primary Language**: Japanese (日本語)

## Language Requirements (重要)

**All outputs MUST be in Japanese.** This includes:
- Responses, explanations, and plans
- Code comments
- Task names and descriptions
- PR/commit body text

**Exception**: Commit message headers follow Conventional Commits in English (e.g., `feat:`, `fix:`).

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 + TypeScript 5.9 |
| Build Tool | Vite 7.2 |
| Styling | Tailwind CSS 4.x |
| Visualization | ReactFlow 11.x, Recharts 3.x, dagre |
| Icons | lucide-react |
| Testing | Vitest 4.x + @testing-library/react |
| Release | semantic-release (automated) |

## Project Structure

```
src/
├── App.tsx                      # Main app component, simulation control
├── main.tsx                     # Entry point
├── components/
│   ├── PipelineFlow.tsx         # ReactFlow visualization
│   ├── BiDashboard.tsx          # BI analytics dashboard
│   ├── JobMonitor.tsx           # Job execution monitoring
│   ├── Documentation.tsx        # In-app documentation
│   ├── common/                  # Shared components (ErrorBoundary)
│   ├── nodes/                   # ReactFlow node components
│   ├── settings/                # 14 settings panel components
│   │   ├── MappingDesigner.tsx  # ETL mapping visual designer
│   │   ├── TaskFlowDesigner.tsx # Task orchestration
│   │   └── ...
│   └── views/                   # Data display views
├── lib/
│   ├── MappingEngine.ts         # Core ETL execution engine (1000+ lines)
│   ├── MappingTypes.ts          # ETL type definitions
│   ├── ExpressionFunctions.ts   # ETL expression evaluation
│   ├── DataGenerator.ts         # Test data generation
│   ├── VirtualFileSystem.tsx    # In-memory file system
│   ├── VirtualDB.tsx            # In-memory database
│   ├── SettingsContext.tsx      # Global settings state
│   ├── JobMonitorContext.tsx    # Job tracking state
│   ├── context/                 # Additional contexts
│   ├── hooks/
│   │   ├── useSimulationEngine.ts  # Main simulation orchestration
│   │   └── useSimulationTimers.ts  # Timing control
│   ├── i18n/                    # Internationalization
│   ├── types.ts                 # Centralized type definitions
│   ├── validation.ts            # Settings validation
│   └── *.test.ts                # Unit tests (11 files)
└── assets/                      # Static assets

.specify/                        # Specification framework
├── memory/constitution.md       # Project principles
├── specs/                       # Feature specifications (001-007)
└── templates/                   # Spec templates

.github/workflows/               # CI/CD
├── release.yml                  # Semantic release
└── deploy.yml                   # GitHub Pages deployment
```

## Essential Commands

```bash
# Development
npm run dev          # Start dev server (http://localhost:5173)

# MANDATORY before commits
npm test             # Run unit tests (vitest)
npm run build        # TypeScript check + production build

# Other
npm run lint         # ESLint check
npm run preview      # Preview production build
```

## Verification Process (必須)

**CRITICAL**: Before ANY commit or PR, you MUST run:

```bash
npm test && npm run build
```

- `npm test` validates logic correctness
- `npm run build` catches TypeScript errors (TS errors are NOT caught by tests alone)

Both commands must pass before committing.

## Key Files to Understand

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main application orchestrator, simulation control |
| `src/lib/MappingEngine.ts` | ETL transformation engine (21+ transformation types) |
| `src/lib/MappingTypes.ts` | Type definitions for all ETL operations |
| `src/lib/hooks/useSimulationEngine.ts` | Core simulation logic |
| `src/lib/SettingsContext.tsx` | Global state management |
| `src/components/settings/MappingDesigner.tsx` | Visual ETL designer |
| `.specify/specs/` | Feature specifications |

## ETL Transformation Types

The MappingEngine supports these transformations:
- **Basic**: Source, Target, Filter, Expression
- **Aggregation**: Aggregator, Sorter, Rank, Sequence
- **Joins**: Joiner, Lookup (with caching), Union
- **Data Processing**: Router, Normalizer, Deduplicator, Pivot, Unpivot
- **Advanced**: SQL, WebService, HierarchyParser, Cleansing, UpdateStrategy

## Coding Conventions

### TypeScript
- **Strict mode enabled** - no implicit any
- Avoid `any` type - use specific types or generics
- Define types in `MappingTypes.ts` or `types.ts`

### React
- Functional components with hooks
- Use Context API for global state
- Wrap components with ErrorBoundary for isolation
- Extract complex logic into custom hooks

### Comments
- All code comments in Japanese
- Update existing English comments to Japanese when encountered

### Testing
- Test files co-located in `src/lib/`
- Use Vitest + @testing-library/react
- Core logic (MappingEngine, DataGenerator) has comprehensive tests

## Commit Messages (Conventional Commits)

```
<type>(<scope>): <description in English>

<body in Japanese>
```

### Types
| Type | Description | Version Impact |
|------|-------------|----------------|
| `feat` | New feature | Minor (1.x.0) |
| `fix` | Bug fix | Patch (1.0.x) |
| `docs` | Documentation only | None |
| `refactor` | Code restructuring | None |
| `test` | Test changes | None |
| `perf` | Performance improvement | Patch |
| `chore` | Build/tool changes | None |

### Breaking Changes
```
feat!: description

BREAKING CHANGE: explanation in Japanese
```

## Development Workflow

1. Create feature branch from `main`
2. Implement changes
3. Run `npm test && npm run build` (MANDATORY)
4. Commit following Conventional Commits
5. Create PR
6. After merge, semantic-release auto-handles versioning

## Architecture Patterns

### State Management
- React Context API + useReducer
- `SettingsContext` - Global application settings
- `JobMonitorContext` - Job execution tracking
- `VirtualFileSystem` / `VirtualDB` - Simulated storage

### Component Design
- Separation: UI components vs. business logic (hooks/lib)
- Props-driven configuration
- ErrorBoundary for fault isolation

### File System Simulation
- In-memory file system with host/path hierarchy
- File locking for concurrent access
- Supports multi-host configuration

## Specification System (.specify/)

Feature specifications follow a structured format:
- `spec.md` - Feature requirements
- `tasks.md` - Task breakdown
- `plan.md` - Implementation plan
- `checklist.md` - Acceptance criteria

Current specs: 001 (initial) through 007 (CDI router fix)

## Common Tasks

### Adding a New Transformation Type
1. Add type definition to `MappingTypes.ts`
2. Implement in `MappingEngine.ts`
3. Add UI in `MappingDesigner.tsx`
4. Write tests in `MappingEngine.test.ts`

### Adding a New Settings Panel
1. Create component in `src/components/settings/`
2. Register in `SettingsPanel.tsx`
3. Add state to `SettingsContext.tsx`
4. Add validation in `validation.ts`

### Modifying Simulation Logic
1. Core logic in `useSimulationEngine.ts`
2. Timer control in `useSimulationTimers.ts`
3. Test changes with `npm test`

## Troubleshooting

### Build Fails with TS Errors
- Run `npm run build` to see full error output
- Common issues: unused variables, type mismatches
- Fix all errors before committing

### Tests Pass but Build Fails
- Tests don't catch all TypeScript errors
- Always run both `npm test` AND `npm run build`

### ReactFlow Layout Issues
- Check `dagre` layout configuration
- Verify node dimensions in ProcessNode/StorageNode

## Additional Documentation

- `README.md` - User documentation (Japanese)
- `AGENTS.md` - AI agent guidelines (detailed Japanese rules)
- `CONTRIBUTING.md` - Contribution guide
- `.specify/memory/constitution.md` - Project principles
