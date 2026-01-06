# Data Model: View-Only Access Links

**Feature**: View-Only Access Links  
**Date**: 2026-01-06  
**Version**: 1.0

## Entities

### TodoList

**Purpose**: Root document representing a todo list with both edit and view-only access identifiers

**Fields**:

| Field | Type | Required | Unique | Default | Description |
|---|---|---|---|---|---|
| `_id` | ObjectId | Yes | Yes | Auto | MongoDB primary key |
| `shareId` | string | Yes | Yes | Generated | Edit permission identifier (9-char alphanumeric) |
| `viewId` | string | No | Yes | Generated | View permission identifier (9-char alphanumeric) |
| `title` | string | Yes | No | - | Display name for the list |
| `createdAt` | Date | Yes | No | new Date() | Timestamp of list creation |
| `updatedAt` | Date | Yes | No | new Date() | Timestamp of last modification |

**Indexes**:
- `{ _id: 1 }` - Primary key (automatic)
- `{ shareId: 1 }` - Unique index for edit access lookups
- `{ viewId: 1 }` - Unique sparse index for view-only access lookups

**Validation Rules**:
- `shareId` must be exactly 9 characters matching `[a-z0-9]{9}`
- `viewId` (if present) must be exactly 9 characters matching `[a-z0-9]{9}`
- `shareId` and `viewId` must be different
- `title` must not be empty string (length >= 1)
- No two lists may share the same `shareId`
- No two lists may share the same `viewId`
- A `viewId` cannot collide with any existing `shareId` and vice versa

**State Transitions**:
```
[New List] --POST /api/lists--> [Created with shareId + viewId]
[Existing List without viewId] --GET /api/lists/[id]--> [viewId generated lazily]
```

**Relationships**:
- **Has Many** TodoItem documents (via parent reference)

---

### TodoItem

**Purpose**: Individual task within a todo list

**Fields**:

| Field | Type | Required | Unique | Default | Description |
|---|---|---|---|---|---|
| `_id` | ObjectId | Yes | Yes | Auto | MongoDB primary key |
| `listShareId` | string | Yes | No | - | Foreign key to TodoList.shareId |
| `text` | string | Yes | No | - | Task description |
| `completed` | boolean | Yes | No | false | Task completion status |
| `createdAt` | Date | Yes | No | new Date() | Timestamp of item creation |

**Indexes**:
- `{ _id: 1 }` - Primary key (automatic)
- `{ listShareId: 1 }` - For querying items by list

**Validation Rules**:
- `listShareId` must reference an existing TodoList's shareId
- `text` must not be empty string (length >= 1)
- `completed` must be boolean

**State Transitions**:
```
[Non-existent] --POST /api/lists/[shareId]/items--> [Created with completed=false]
[Uncompleted] --PUT /api/lists/[shareId]/items/[id]--> [Completed]
[Completed] --PUT /api/lists/[shareId]/items/[id]--> [Uncompleted]
[Existing] --DELETE /api/lists/[shareId]/items/[id]--> [Deleted]
```

**Relationships**:
- **Belongs To** TodoList (via `listShareId` → `shareId`)

---

## TypeScript Interfaces

### Database Layer (lib/db-types.ts)

```typescript
import { ObjectId } from 'mongodb';

/**
 * TodoList document as stored in MongoDB
 */
export interface TodoListDocument {
  _id: ObjectId;
  shareId: string;
  viewId?: string; // Optional for backward compatibility
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * TodoItem document as stored in MongoDB
 */
export interface TodoItemDocument {
  _id: ObjectId;
  listShareId: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

/**
 * Permission type for access control
 */
export type Permission = 'view' | 'edit';
```

### API Layer (API Route Response Types)

```typescript
/**
 * GET /api/lists/[shareId] response
 */
export interface GetListResponse {
  _id: string;
  shareId: string;
  viewId: string; // Always present in response (generated if missing)
  title: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  permission: Permission; // Detected from request
}

/**
 * POST /api/lists request
 */
export interface CreateListRequest {
  title: string;
}

/**
 * POST /api/lists response
 */
export interface CreateListResponse {
  _id: string;
  shareId: string;
  viewId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/lists/[shareId]/items response
 */
export interface GetItemsResponse {
  items: Array<{
    _id: string;
    listShareId: string;
    text: string;
    completed: boolean;
    createdAt: string;
  }>;
}

/**
 * POST /api/lists/[shareId]/items request
 */
export interface CreateItemRequest {
  text: string;
}

/**
 * Error response (403, 404, etc.)
 */
export interface ErrorResponse {
  error: string;
}
```

### Client Layer (React Component Props)

```typescript
/**
 * Props for TodoListClient component
 */
export interface TodoListClientProps {
  initialList: {
    _id: string;
    shareId: string;
    viewId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  };
  initialItems: Array<{
    _id: string;
    listShareId: string;
    text: string;
    completed: boolean;
    createdAt: string;
  }>;
  permission: Permission; // Determined by server
}

/**
 * Props for permission-aware components
 */
export interface PermissionAwareProps {
  permission: Permission;
}
```

---

## Data Flow

### Read Flow (GET /api/lists/[shareId])

1. **Client** requests `/list/abc123xyz`
2. **Server Component** calls `GET /api/lists/abc123xyz`
3. **API Route** queries MongoDB:
   ```typescript
   const list = await collection.findOne({
     $or: [{ shareId: 'abc123xyz' }, { viewId: 'abc123xyz' }]
   });
   ```
4. **Permission Detection**:
   ```typescript
   if (!list) return 404;
   const permission = list.shareId === 'abc123xyz' ? 'edit' : 'view';
   ```
5. **Lazy ViewId Generation** (if needed):
   ```typescript
   if (!list.viewId) {
     const viewId = generateShareId();
     await collection.updateOne({ _id: list._id }, { $set: { viewId } });
     list.viewId = viewId;
   }
   ```
6. **Response** includes permission:
   ```json
   {
     "_id": "...",
     "shareId": "abc123xyz",
     "viewId": "def456uvw",
     "title": "My List",
     "permission": "edit"
   }
   ```

### Write Flow (POST /api/lists/[shareId]/items)

1. **Client** submits new item with shareId `abc123xyz`
2. **API Route** queries MongoDB (same as read flow)
3. **Permission Check**:
   ```typescript
   const permission = list.shareId === 'abc123xyz' ? 'edit' : 'view';
   if (permission !== 'edit') {
     return NextResponse.json({ error: 'Edit permission required' }, { status: 403 });
   }
   ```
4. **Write Operation**:
   ```typescript
   await itemsCollection.insertOne({
     _id: new ObjectId(),
     listShareId: list.shareId,
     text: requestBody.text,
     completed: false,
     createdAt: new Date()
   });
   ```

---

## Migration Path

### Backward Compatibility

**Existing Data**:
- Lists created before this feature have `viewId: undefined`
- All `TodoItem` documents remain unchanged
- No data loss or corruption

**Handling Old Lists**:
```typescript
// Option 1: Lazy generation (chosen)
if (list && !list.viewId) {
  const viewId = generateShareId();
  // Check for collisions
  const collision = await collection.findOne({
    $or: [{ shareId: viewId }, { viewId }]
  });
  if (collision) {
    // Retry with new viewId
  }
  await collection.updateOne(
    { _id: list._id },
    { $set: { viewId, updatedAt: new Date() } }
  );
}

// Option 2: Bulk migration script (alternative)
const listsWithoutViewId = await collection.find({ viewId: { $exists: false } }).toArray();
for (const list of listsWithoutViewId) {
  const viewId = generateShareId();
  await collection.updateOne({ _id: list._id }, { $set: { viewId } });
}
```

**Database Schema Changes**:
1. Add `viewId` field to TodoList collection (optional)
2. Create unique sparse index on `viewId`
3. No changes to TodoItem collection

---

## Collision Handling

### Collision Scenarios

| Scenario | Check Required | Resolution |
|---|---|---|
| New shareId = existing shareId | Yes | Regenerate shareId |
| New shareId = existing viewId | Yes | Regenerate shareId |
| New viewId = existing shareId | Yes | Regenerate viewId |
| New viewId = existing viewId | Yes | Regenerate viewId |

### Implementation

```typescript
async function generateUniqueIds(
  collection: Collection<TodoListDocument>
): Promise<{ shareId: string; viewId: string }> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const shareId = generateShareId();
    const viewId = generateShareId();

    if (shareId === viewId) {
      attempts++;
      continue; // Regenerate both if they match each other
    }

    const collision = await collection.findOne({
      $or: [
        { shareId },
        { viewId: shareId },
        { shareId: viewId },
        { viewId }
      ]
    });

    if (!collision) {
      return { shareId, viewId };
    }

    attempts++;
  }

  throw new Error('Failed to generate unique IDs after 10 attempts');
}
```

---

## Performance Characteristics

### Read Operations

| Operation | Query | Index Used | Avg Time |
|---|---|---|---|
| Get list by shareId | `{ shareId: X }` | `shareId_1` | <5ms |
| Get list by viewId | `{ viewId: X }` | `viewId_1` | <5ms |
| Get list by either | `{ $or: [{ shareId: X }, { viewId: X }] }` | Both indexes | <10ms |
| Get items for list | `{ listShareId: X }` | `listShareId_1` | <10ms |

### Write Operations

| Operation | Query | Index Used | Avg Time |
|---|---|---|---|
| Create list | Insert + collision check | Both unique indexes | <20ms |
| Create item | Insert | None (writes) | <5ms |
| Update list title | `{ shareId: X }` | `shareId_1` | <5ms |
| Update item | `{ _id: X }` | `_id` (primary) | <5ms |
| Delete item | `{ _id: X }` | `_id` (primary) | <5ms |

### Collision Probability

With N existing lists:
- Probability of shareId collision: N / (36^9) ≈ N / 1.01×10^14
- Probability of viewId collision: N / (36^9) ≈ N / 1.01×10^14
- Probability of cross-collision: 2N / (36^9) ≈ 2N / 1.01×10^14

For 1 million lists:
- Collision probability ≈ 3×10^6 / 1.01×10^14 ≈ 0.00003%

---

## Summary

### Key Changes
1. **TodoList**: Add optional `viewId` field with unique sparse index
2. **No changes to TodoItem**: Remains unchanged
3. **TypeScript**: Add `Permission` type and update interfaces

### Entity Count
- **2 entities**: TodoList, TodoItem
- **1 new field**: `TodoList.viewId`
- **1 new index**: `viewId_1` (unique, sparse)
- **1 new type**: `Permission = 'view' | 'edit'`

### Constraints Enforced
- ✅ Unique shareId across all lists
- ✅ Unique viewId across all lists (when defined)
- ✅ No shareId can equal any viewId
- ✅ viewId optional for backward compatibility
