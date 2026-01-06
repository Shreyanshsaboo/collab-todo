# Research: Collaborative To-Do Application

**Feature**: 001-collab-todo-link  
**Date**: 2026-01-05  
**Status**: Complete

## Overview

This document captures research findings and technical decisions for implementing the collaborative to-do application. All decisions align with the project constitution and industry best practices.

---

## Research Areas

### 1. ShareId Generation Strategy

**Decision**: Use 9-character alphanumeric (lowercase a-z + 0-9) randomly generated strings

**Rationale**:
- 36^9 = 101,559,956,668,416 possible combinations (~101 trillion)
- Collision probability is negligible for expected scale (<1M lists)
- Short enough for manual sharing if needed
- URL-safe characters only (no escaping required)
- Industry standard (similar to YouTube video IDs at 11 chars, Bitly at 7 chars)

**Alternatives Considered**:
- UUIDs: Too long (36 characters), not user-friendly
- Sequential IDs: Security risk (enumeration attacks), predictable
- Hash-based: Requires additional input (timestamp, counter), more complex

**Implementation Notes**:
- Use crypto.randomBytes() or similar for cryptographic randomness
- Check for collisions before saving to database
- Regenerate if collision detected (extremely rare)

---

### 2. Synchronization Strategy

**Decision**: Client-side polling every 5 seconds

**Rationale**:
- Meets constitution requirement (no WebSockets in v1)
- Simple to implement and debug
- Works reliably across all browsers and networks
- No server-side connection management overhead
- Acceptable latency for collaborative to-do lists (not real-time chat)

**Alternatives Considered**:
- WebSockets: Rejected per constitution for v1, reserved for future
- Server-Sent Events (SSE): Similar complexity to WebSockets, one-way only
- Long polling: More complex than simple polling, minimal benefit
- Manual refresh: Poor UX, no automatic sync

**Implementation Notes**:
- Use setInterval() for polling loop
- Fetch GET /api/lists/[shareId] every 5 seconds
- Clear interval on component unmount
- Handle errors gracefully (retry with exponential backoff)
- Optimize by only updating DOM if data changed (compare timestamps)

---

### 3. Database Schema Design

**Decision**: Two collections (TodoList, TodoItem) with embedded relationships via listId

**Rationale**:
- Normalized design prevents data duplication
- Easy to query all items for a list with single index
- Supports efficient updates to individual items
- Allows independent item management (reordering, deletion)
- Standard relational pattern in document databases

**Alternatives Considered**:
- Embedded items in list document: Difficult to update individual items, size limits
- Single collection with discriminator: Complex queries, poor performance
- Separate database per list: Massive overhead, not scalable

**Schema Details**:
```typescript
// TodoList Collection
{
  _id: ObjectId,
  shareId: string (unique index),
  title: string,
  createdAt: Date,
  updatedAt: Date
}

// TodoItem Collection
{
  _id: ObjectId,
  listId: ObjectId (index),
  text: string,
  completed: boolean,
  order: number,
  createdAt: Date,
  updatedAt: Date
}

// Compound index: (listId, order) for efficient sorted retrieval
```

---

### 4. Conflict Resolution

**Decision**: Last-write-wins (LWW) with server timestamps

**Rationale**:
- Simplest conflict resolution strategy
- No client-side merge logic required
- Server timestamp is authoritative
- Acceptable for to-do lists (not financial transactions)
- Standard approach for v1 collaborative apps

**Alternatives Considered**:
- Operational Transformation (OT): Too complex for v1, needed for real-time editing
- CRDT: Overkill for simple task list, adds significant complexity
- Client-side merge: Requires conflict detection, resolution UI, complex logic
- Pessimistic locking: Poor UX (blocks users), not RESTful

**Implementation Notes**:
- Server sets updatedAt timestamp on all mutations
- Clients display latest state from server
- No conflict detection or resolution UI in v1
- Users understand that concurrent edits follow last-write-wins

---

### 5. API Design Patterns

**Decision**: RESTful API with resource-oriented URLs

**Rationale**:
- Follows HTTP semantics (GET=read, POST=create, PATCH=update, DELETE=remove)
- Predictable URL patterns for developers
- Cacheable responses (future optimization)
- Standard status codes for error handling
- Aligns with Next.js API Routes conventions

**Endpoint Structure**:
```
POST   /api/lists                           → Create list
GET    /api/lists/[shareId]                 → Get list + items
PATCH  /api/lists/[shareId]                 → Update list metadata
POST   /api/lists/[shareId]/items           → Create item
PATCH  /api/lists/[shareId]/items/[itemId]  → Update item
DELETE /api/lists/[shareId]/items/[itemId]  → Delete item
```

**Alternatives Considered**:
- GraphQL: Overkill for simple CRUD, adds complexity, not in constitution
- RPC-style: Less RESTful, harder to cache, not standard for web apps
- Flat structure (/api/items/[itemId]): Loses hierarchical relationship in URL

---

### 6. MongoDB Connection Management

**Decision**: Connection pooling with cached client in serverless environment

**Rationale**:
- Next.js API routes run in serverless/edge functions
- Connection reuse across invocations reduces latency
- MongoDB driver handles connection pooling automatically
- Caching client prevents "too many connections" error
- Standard pattern for serverless MongoDB applications

**Implementation Pattern**:
```typescript
let cachedClient: MongoClient | null = null;

export async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient.db(process.env.MONGODB_DATABASE);
  }
  
  const client = await MongoClient.connect(process.env.MONGODB_URI!);
  cachedClient = client;
  return client.db(process.env.MONGODB_DATABASE);
}
```

**Alternatives Considered**:
- New connection per request: Extremely slow (100-500ms per connect), exhausts connection pool
- Mongoose ODM: Adds abstraction layer, not needed for simple schema, increases bundle size
- Database-per-request pattern: Only works for persistent servers, not serverless

---

### 7. Frontend State Management

**Decision**: Component-local state with React useState and useEffect

**Rationale**:
- Simple application scope (single shared list per page)
- No global state needed across routes
- React built-ins sufficient for data fetching and rendering
- Reduces dependencies and complexity
- Easy to upgrade to React Query or SWR later if needed

**State Structure**:
```typescript
// In TodoList component
const [list, setList] = useState<TodoList | null>(null);
const [items, setItems] = useState<TodoItem[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

**Alternatives Considered**:
- Redux: Massive overkill for single-page state, adds boilerplate
- Zustand: Not needed for simple component state
- React Query: Good for future, but useState sufficient for v1
- Context API: Unnecessary when state is scoped to single component

---

### 8. Optimistic Updates

**Decision**: Implement optimistic updates for all mutations (add, toggle, delete)

**Rationale**:
- Significantly improves perceived performance
- Users see immediate feedback on actions
- Standard pattern for modern web applications
- Easy to implement with useState
- Enhances UX even with 5-second polling

**Implementation Pattern**:
```typescript
async function handleAddItem(text: string) {
  // Optimistic update
  const tempItem = { _id: 'temp-' + Date.now(), text, completed: false, order: items.length };
  setItems([...items, tempItem]);
  
  try {
    const response = await fetch(`/api/lists/${shareId}/items`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
    const { item } = await response.json();
    
    // Replace temp item with real item
    setItems(items => items.map(i => i._id === tempItem._id ? item : i));
  } catch (error) {
    // Revert on error
    setItems(items => items.filter(i => i._id !== tempItem._id));
    showError('Failed to add item');
  }
}
```

**Alternatives Considered**:
- Wait for server response: Poor UX, feels slow even with fast API
- No rollback on error: Leaves UI in inconsistent state
- Server-side rendering only: Doesn't work for mutations, requires full page reload

---

### 9. Error Handling Strategy

**Decision**: Graceful degradation with user-friendly error messages

**Rationale**:
- Network failures are inevitable in web applications
- Users need clear feedback on what went wrong
- Application should remain functional despite errors
- Retry mechanisms for transient failures

**Error Categories**:
1. **Network errors**: Retry automatically, show "Connection lost" message
2. **Validation errors (400)**: Show inline error message, don't retry
3. **Not found errors (404)**: Redirect to home page or show "List not found"
4. **Server errors (500)**: Show generic error, log to console, allow retry

**Implementation Notes**:
- Use try-catch blocks around all fetch() calls
- Display errors in toast notifications (simple div overlay)
- Provide "Retry" button for failed operations
- Log detailed errors to console for debugging

---

### 10. Task Ordering Strategy

**Decision**: Integer-based ordering with gaps (0, 100, 200, ...)

**Rationale**:
- Simple to implement and understand
- Allows future reordering without updating all items
- Efficient sorting in database queries
- No need for complex fractional indexing in v1

**Ordering Rules**:
- New items get `max(order) + 100` or 0 if empty
- Items retrieved with `ORDER BY order ASC`
- Reordering (future) updates order field directly

**Alternatives Considered**:
- Fractional indexing: More complex, not needed for v1 without drag-drop
- Linked list: Requires updating multiple items, complex queries
- Timestamp-based: Not controllable by user, can't reorder

---

## Technology Stack Summary

### Frontend
- **Framework**: Next.js 16+ (App Router)
- **UI Library**: React 19+
- **Styling**: TailwindCSS 4 (already configured)
- **Language**: TypeScript 5.x
- **State Management**: React useState/useEffect
- **HTTP Client**: fetch() (native)

### Backend
- **Runtime**: Node.js (Next.js API routes)
- **Framework**: Next.js App Router API routes
- **Database**: MongoDB 5+
- **Database Driver**: mongodb npm package
- **Language**: TypeScript 5.x

### Development Tools
- **Package Manager**: npm (already in use)
- **Linting**: ESLint (already configured)
- **Type Checking**: TypeScript compiler

### Deployment
- **Platform**: Vercel (recommended for Next.js) or any Node.js host
- **Database**: MongoDB Atlas (cloud) or self-hosted

---

## Best Practices Applied

### 1. Type Safety
- Use TypeScript interfaces for all data structures
- Strict mode enabled
- No `any` types in production code

### 2. Error Boundaries
- Try-catch blocks around all async operations
- User-friendly error messages
- Console logging for debugging

### 3. Performance
- Optimize polling (only update if data changed)
- Use React.memo for expensive components (if needed)
- Debounce user input (if needed)

### 4. Security
- Server-side validation for all inputs
- Sanitize user input to prevent XSS
- Use environment variables for secrets
- No authentication means no security concerns for v1

### 5. Accessibility
- Semantic HTML (form, button, input)
- Proper label associations
- Keyboard navigation support
- ARIA attributes where needed

---

## Open Questions Resolved

**Q**: Should we implement undo functionality?  
**A**: No, out of scope for v1 per spec.

**Q**: Should we support rich text formatting?  
**A**: No, plain text only per spec (keeps it simple).

**Q**: What happens if MongoDB connection fails?  
**A**: Display error message, provide retry option, log to console.

**Q**: Should we batch API calls?  
**A**: No, keep it simple. Individual calls are sufficient for v1.

**Q**: Should we implement caching?  
**A**: No client-side caching beyond component state. Server-side caching can be added later.

---

## Conclusion

All research areas have been resolved with concrete decisions that align with the project constitution. The technology stack is proven, well-supported, and appropriate for the feature scope. No blockers remain for proceeding to Phase 1 (Design & Contracts).

**Next Phase**: Generate data-model.md, contracts/, and quickstart.md
