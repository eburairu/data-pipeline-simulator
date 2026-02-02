---
description: "Tasks for codebase improvements and technical debt reduction"
---

# Tasks: 006-codebase-improvements

**Input**: Codebase analysis and `spec.md`
**Prerequisites**: None

## Phase 1: Type Safety & Core Logic

- [x] T001 [Type] Refactor `src/lib/ExpressionFunctions.ts` to use Generics instead of `any`.
- [x] T002 [Type] Define `TranslationKey` type in `src/lib/i18n/translations.ts` and update `LanguageContext.tsx`.

## Phase 2: Architectural Decomposition

- [x] T003 [Refactor] Extract `StorageView` from `src/App.tsx` to `src/components/views/StorageView.tsx`.
- [x] T004 [Refactor] Extract `DatabaseView` from `src/App.tsx` to `src/components/views/DatabaseView.tsx`.
- [x] T005 [Refactor] Create `src/lib/migrations/DataMigration.ts` and move migration logic from `src/lib/context/DataContext.tsx` (or `SettingsContext.tsx` if applicable).

## Phase 3: UI Standardization

- [ ] T006 [UI] Create `src/components/common/ParamInput.tsx` for key-value pair editing.
- [ ] T007 [UI] Replace inline parameter inputs in `MappingTaskSettings.tsx` with `ParamInput`.
- [ ] T008 [UI] Replace inline parameter inputs in `DataSourceSettings.tsx` with `ParamInput`.

## Phase 4: Performance & Polish

- [ ] T009 [Perf] Implement rendering limit (max 100 items) for `DatabaseView` to prevent DOM bloating.
- [ ] T010 [Test] Run `npm test` and `npm run build` to ensure no regressions.
