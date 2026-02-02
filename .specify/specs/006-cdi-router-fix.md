# Spec 006: CDI Router Transformation Fix

## Background
The current implementation of the `Router` transformation in `MappingEngine` is incomplete. It calculates routed rows but only passes the rows from the `defaultGroup` to downstream transformations. In a real Data Integration environment (like Informatica CDI), a Router transformation can send different subsets of data to different downstream branches based on conditions.

## Requirements

### 1. Data Model Update
- Extend `MappingLink` interface in `MappingTypes.ts` to include an optional `routerGroup` property.
  - This allows a link to specify which output group of a Router it is connected to.

### 2. Mapping Engine Update
- Modify `traverseAsync` in `MappingEngine.ts` to:
  - Identify if the current node is a `Router`.
  - When iterating outgoing links, check the `routerGroup` property of the link.
  - Retrieve the corresponding subset of data (batch) from the Router's processing result.
  - Pass the correct subset to the next node.

### 3. Verification
- Create a unit test `MappingEngine_Router.test.ts` to verify:
  - Data is correctly split into multiple groups.
  - Downstream nodes receive the correct subset of data based on the link configuration.
  - The default group receives rows that do not match any condition.

## User Interface Impact
- No direct UI changes in this task (assuming the UI editor will be updated separately or manually configured for now). The focus is on the engine capabilities.

## Technical Details

### MappingLink Interface
```typescript
export interface MappingLink {
  id: string;
  sourceId: string;
  targetId: string;
  routerGroup?: string; // New optional property
}
```

### Engine Logic
Current logic:
```typescript
const routed = processRouter(nextNode, batch, parameters);
processedBatch = routed[nextNode.config.defaultGroup || 'default'];
```

New logic (conceptual):
```typescript
// Inside traverseAsync loop for outgoingLinks
if (currentNode.type === 'router') {
    // If the previous node was a router, the 'batch' passed to this function
    // needs to be specific to the link that brought us here.
    // However, traverseAsync is called *after* processing the current node.
    // So we need to look at how traverseAsync calls itself recursively.
}
```

Correction: `traverseAsync` processes the `currentNode`, then iterates `outgoingLinks`.
For a Router node:
1. Execute `processRouter` -> returns `Record<string, DataRow[]>`.
2. Iterate `outgoingLinks`.
3. For each link, determine which group it belongs to (`link.routerGroup`).
4. Select the specific batch from the result of `processRouter`.
5. Call `traverseAsync` for the `nextNode` with that specific batch.

For non-Router nodes, behavior remains unchanged (pass the single `processedBatch`).
