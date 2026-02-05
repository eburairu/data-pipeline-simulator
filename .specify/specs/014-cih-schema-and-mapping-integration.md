# Specification: CIH Topic Schema and Mapping Integration

## Overview
This specification outlines the enhancements to simulate Informatica Cloud Integration Hub (CIH) features more accurately. Specifically, it introduces **Topic Schema Definitions** to enforce data structure on topics and enables **Data Integration (Mapping)** tasks to publish data directly to Topics.

## Features

### 1. Topic Schema Definition
- **Objective**: Define the structure of data allowed in a Topic.
- **Data Model**:
    - Add `schema: FieldDefinition[]` to `TopicDefinition`.
    - Add `schemaEnforcement`:
        - `strict`: Rejects rows that do not match the schema (wrong type or missing required fields).
        - `lenient`: Allows extra fields but validates defined ones.
        - `none`: No validation.
- **UI**:
    - Enhance `TopicSettings.tsx` to allow adding/removing fields and setting types.

### 2. Mapping to Topic Publication
- **Objective**: Allow Mapping tasks to write the output of a transformation directly to a Topic, simulating a "Publication Mapping".
- **Data Model**:
    - Update `TargetConfig` in `MappingTypes.ts`:
        - `targetType`: `'connection'` (default) or `'topic'`.
        - `topicId`: The ID of the target topic (used when `targetType` is `'topic'`).
- **Engine Logic**:
    - Update `MappingEngine.ts` to handle `targetType === 'topic'`.
    - Write output to `/topics/<topicId>/<timestamp>.json`.
    - Perform schema validation before writing.
- **UI**:
    - Update `TargetConfigPanel.tsx` to allow selecting "Topic" as a target.

## Technical Implementation

### Type Changes
**`src/lib/types.ts`**
```typescript
export interface TopicDefinition {
  id: string;
  name: string;
  retentionPeriod: number;
  description?: string;
  schema?: FieldDefinition[];
  schemaEnforcement?: 'strict' | 'lenient' | 'none';
}
```

**`src/lib/MappingTypes.ts`**
```typescript
export interface TargetConfig {
  // ... existing fields
  targetType?: 'connection' | 'topic';
  topicId?: string;
}
```

### Validation Logic
Implement `validateRowAgainstSchema(row: DataRow, schema: FieldDefinition[], enforcement: string): { valid: boolean; error?: string }` in `src/lib/validation.ts`.

### Engine Changes
- Pass `topics` list to `executeMappingTask` and down to `processTarget`.
- In `processTarget`, if `targetType` is 'topic':
    1. Resolve Topic ID.
    2. Validate batch against Topic Schema (if defined).
    3. Filter valid rows (or reject based on error behavior).
    4. Write valid rows to Virtual File System.

## Verification
- Unit tests for schema validation logic.
- Integration test for Mapping Engine writing to Topic.
