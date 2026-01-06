# Research: View-Only Access Links

**Feature**: View-Only Access Links  
**Date**: 2026-01-06  
**Purpose**: Research decisions for implementing permission-based access control

## Research Tasks

### 1. Permission Detection Strategy

**Question**: How should the system distinguish between shareId (edit) and viewId (view) identifiers?

**Options Considered**:
1. **URL Path Parameter (Chosen)**: Use `/list/[id]` where `id` can be either shareId or viewId, detect type by querying database
2. **Separate Routes**: Use `/list/edit/[shareId]` and `/list/view/[viewId]`
3. **Query Parameter**: Use `/list/[listId]?token=viewToken` with token-based auth

**Decision**: **Option 1 - URL Path Parameter with Database Detection**

**Rationale**:
- Maintains clean, simple URLs (`/list/abc123xyz`)
- Backward compatible with existing shareId links
- No routing changes required (reuse `/list/[shareId]` route)
- Detection logic isolated in API routes
- Both identifiers are 9-character alphanumeric strings, making them indistinguishable in the URL (which is good for security - viewers don't know they have limited permissions by looking at the URL)

**Implementation**:
```typescript
// In GET /api/lists/[shareId]/route.ts
const { shareId } = await params;
const list = await collection.findOne({
  $or: [{ shareId }, { viewId: shareId }]
});

if (!list) return 404;

const permission = list.shareId === shareId ? 'edit' : 'view';
```

**Alternatives Rejected**:
- **Separate Routes**: Requires route duplication and breaks existing links if users switch between permissions
- **Query Parameters**: Exposes permission model explicitly, makes URLs longer, complicates sharing

---

### 2. ViewId Generation Timing

**Question**: When should viewId be generated for a todo list?

**Options Considered**:
1. **On List Creation**: Generate viewId immediately when POST /api/lists is called
2. **On Demand**: Generate viewId only when user requests view-only link
3. **On First View Access**: Generate viewId when someone tries to access list with a viewId that doesn't exist yet

**Decision**: **Option 1 - On List Creation**

**Rationale**:
- Simplifies logic (no lazy generation needed)
- Ensures every list always has both shareId and viewId
- No race conditions from concurrent requests
- Consistent with Constitution principle of "Backend as Single Source of Truth"
- Minimal performance impact (one additional string generation per list)

**Implementation**:
```typescript
// In POST /api/lists/route.ts
const shareId = generateShareId();
const viewId = generateShareId(); // Reuse same function, generates different value

// Check for collisions with both shareId and viewId
const existing = await collection.findOne({
  $or: [{ shareId }, { viewId: shareId }, { shareId: viewId }, { viewId }]
});
```

**Backward Compatibility**:
- Existing lists have `viewId: undefined`
- Add migration logic: If viewId is undefined, generate one on first access
- Mark viewId field as optional in TypeScript: `viewId?: string`

**Alternatives Rejected**:
- **On Demand**: Adds UI complexity (button to generate link), delays availability
- **On First View Access**: Complex lazy loading logic, potential race conditions

---

### 3. Permission Enforcement Pattern

**Question**: How should API routes check and enforce permissions?

**Options Considered**:
1. **Middleware Function**: Create a `checkPermission(requiredPermission: 'view' | 'edit')` middleware
2. **Inline Checks**: Detect permission in each route handler and return 403 if insufficient
3. **Decorator Pattern**: Use TypeScript decorators to mark routes with required permissions

**Decision**: **Option 2 - Inline Permission Checks**

**Rationale**:
- Next.js App Router doesn't have traditional middleware pattern for route handlers
- Inline checks are explicit and easy to audit
- No magic/hidden behavior (aligns with Constitution "Simplicity First")
- TypeScript provides compile-time safety without decorators
- Clear error handling at the point of use

**Implementation Pattern**:
```typescript
// For write operations
const list = await collection.findOne({ $or: [{ shareId }, { viewId: shareId }] });
const permission = list.shareId === shareId ? 'edit' : 'view';

if (permission !== 'edit') {
  return NextResponse.json(
    { error: 'Edit permission required' },
    { status: 403 }
  );
}

// Proceed with write operation
```

**Alternatives Rejected**:
- **Middleware**: Not well-supported in App Router for route-level logic
- **Decorators**: Adds complexity, requires experimental TypeScript features

---

### 4. UI Conditional Rendering Strategy

**Question**: How should UI components hide edit controls for view-only users?

**Options Considered**:
1. **Permission Prop**: Pass `permission: 'view' | 'edit'` prop from page to client component
2. **Feature Flag**: Use context provider with permission stored globally
3. **URL Inspection**: Components parse URL to determine permission themselves

**Decision**: **Option 1 - Permission Prop**

**Rationale**:
- Explicit data flow (props down, events up)
- No global state needed
- Testable (pass different permission values in tests)
- Aligns with React best practices and Constitution "Clear Separation of Concerns"
- Server component detects permission, client component renders accordingly

**Implementation**:
```typescript
// In app/list/[shareId]/page.tsx (Server Component)
const list = await collection.findOne({ $or: [{ shareId }, { viewId: shareId }] });
const permission = list.shareId === shareId ? 'edit' : 'view';

return (
  <TodoListClient
    initialList={list}
    initialItems={items}
    permission={permission}
  />
);

// In components/TodoListClient.tsx (Client Component)
export function TodoListClient({ permission }: { permission: 'view' | 'edit' }) {
  return (
    <>
      {permission === 'edit' && <AddItemForm />}
      {permission === 'edit' && <EditListTitle />}
      {/* ... */}
    </>
  );
}
```

**Alternatives Rejected**:
- **Feature Flag/Context**: Overkill for single boolean; adds complexity
- **URL Inspection**: Violates "Backend as Source of Truth"; duplicates detection logic

---

### 5. Database Index Strategy

**Question**: How should viewId be indexed for optimal query performance?

**Options Considered**:
1. **Unique Index on viewId**: Same as shareId
2. **Compound Index on shareId + viewId**: Single index covering both fields
3. **Partial Index**: Index only documents where viewId exists (for backward compatibility)

**Decision**: **Option 1 - Unique Index on viewId**

**Rationale**:
- Mirrors shareId index strategy (consistency)
- Prevents duplicate viewIds (same guarantee as shareIds)
- Enables fast lookups via `$or` query
- Simple to maintain and understand

**Implementation**:
```typescript
// MongoDB index creation
await collection.createIndex({ viewId: 1 }, { unique: true, sparse: true });
```

**Sparse Option**:
- Use `sparse: true` to handle existing documents with `viewId: undefined`
- Allows null/undefined values while enforcing uniqueness for defined values

**Query Pattern**:
```typescript
// Uses both indexes efficiently
await collection.findOne({
  $or: [
    { shareId: id },
    { viewId: id }
  ]
});
```

**Alternatives Rejected**:
- **Compound Index**: Doesn't help with `$or` queries; requires two separate indexes anyway
- **Partial Index**: More complex; sparse index achieves same goal

---

## Best Practices Applied

### Next.js 16 App Router
- **Async Params**: All route handlers use `await params` per Next.js 16 requirements
- **Server Components**: Permission detection happens server-side before rendering
- **Client Components**: Use `'use client'` directive for interactive components

### MongoDB Driver Patterns
- **Sparse Indexes**: Use `sparse: true` for optional fields with unique constraints
- **$or Queries**: Efficient lookup across shareId and viewId indexes
- **Collision Handling**: Retry generation if duplicate detected (same as shareId)

### TypeScript Type Safety
- **Literal Types**: Use `'view' | 'edit'` instead of enums for simplicity
- **Optional Fields**: Mark viewId as `viewId?: string` for backward compatibility
- **Type Guards**: Explicit permission checks with type narrowing

### Error Handling
- **403 Forbidden**: Permission denied (wrong identifier type for operation)
- **404 Not Found**: List doesn't exist (neither shareId nor viewId match)
- **400 Bad Request**: Invalid identifier format (not 9-char alphanumeric)
- **500 Internal Server Error**: Database/system failure

---

## Migration Strategy

### Existing Lists Without viewId

**Problem**: Lists created before this feature have `viewId: undefined`

**Solution**: Lazy generation on first access

```typescript
// In GET /api/lists/[shareId]/route.ts
if (list && !list.viewId) {
  const viewId = generateShareId();
  await collection.updateOne(
    { _id: list._id },
    { $set: { viewId, updatedAt: new Date() } }
  );
  list.viewId = viewId;
}
```

**Alternative**: Run migration script to populate all existing lists
- Pros: One-time operation, no runtime overhead
- Cons: Requires downtime or careful coordination
- **Decision**: Use lazy generation for simplicity and zero downtime

---

## Performance Considerations

### Collision Probability
- **shareId**: 36^9 = ~1.01 × 10^14 possibilities
- **viewId**: 36^9 = ~1.01 × 10^14 possibilities
- **Combined**: Must check 4 combinations (share/view × existing share/view)
- **Expected Collisions**: With 1 million lists, probability < 0.00001%

### Query Performance
- **Index Usage**: MongoDB uses indexes for both shareId and viewId in `$or` query
- **Worst Case**: Two index scans (one per field)
- **Typical**: Single index scan (most lookups are for shareId)

### Response Time Impact
- **Permission Detection**: +1ms (single database query, indexed)
- **UI Rendering**: No impact (conditional rendering is fast)
- **Overall**: <5ms added latency

---

## Summary of Decisions

| Decision Area | Choice | Rationale |
|---|---|---|
| Permission Detection | URL path with DB lookup | Clean URLs, backward compatible |
| ViewId Generation | On list creation | Simplicity, no race conditions |
| Permission Enforcement | Inline checks in routes | Explicit, App Router compatible |
| UI Conditional Rendering | Permission prop | Explicit data flow, testable |
| Database Indexing | Unique sparse index | Fast lookups, handles undefined |
| Migration | Lazy generation | Zero downtime, simple |

All decisions align with Constitution v2.0.0 principles: Link-Based Access Control, Backend as Source of Truth, Simplicity First.
