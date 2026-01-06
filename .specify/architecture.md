# Collaborative To-Do Application - Architecture Specification

> **⚠️ ARCHITECTURE DOCUMENT OUT OF DATE**
> 
> This architecture document reflects v2.0.0 governance (link-based permissions only).
> The project constitution has been updated to v3.0.0 (authentication-based ownership model).
> 
> **Required updates**:
> - Add User entity and authentication flows
> - Update TodoList to include userId (owner reference)
> - Document authentication/authorization middleware
> - Update API routes to include auth requirements
> - Add session/token management architecture
> - Document permission hierarchy: owner > edit link > view link
> 
> See [.specify/memory/constitution.md](.specify/memory/constitution.md) v3.0.0 for current governance.

## Overview
A link-based collaborative to-do application built with Next.js, TypeScript, and MongoDB. Users can share lists via URLs with view-only or edit permissions, without requiring authentication.

**Permission Model**: Two link types provide access control:
- **Edit links** (via `shareId`): Full read/write access to list and items
- **View links** (via `viewId`, future): Read-only access to list and items

---

## Data Model

### TodoList Collection
```typescript
interface TodoList {
  _id: ObjectId;              // MongoDB ObjectId
  shareId: string;            // Unique edit link identifier (9-char alphanumeric)
  viewId?: string;            // Unique view-only link identifier (future feature)
  title: string;              // List title
  createdAt: Date;            // Creation timestamp
  updatedAt: Date;            // Last modification timestamp
}
```

### TodoItem Collection
```typescript
interface TodoItem {
  _id: ObjectId;              // MongoDB ObjectId
  listId: ObjectId;           // Reference to TodoList._id
  text: string;               // Task description
  completed: boolean;         // Completion status
  order: number;              // Display order (for sorting)
  createdAt: Date;            // Creation timestamp
  updatedAt: Date;            // Last modification timestamp
}
```

### Indexes
- `TodoList.shareId` - Unique index for fast lookup by share URL
- `TodoList.viewId` - Unique index for view-only access (future)
- `TodoItem.listId` - Index for efficient querying of items by list
- `TodoItem.listId + order` - Compound index for ordered retrieval

---

## Permission Architecture

### Current Implementation (v2.0.0)
- All operations use `shareId` (edit permission)
- Write operations (POST, PATCH, DELETE) implicitly require edit access
- Read operations (GET) allow both edit and view access (future: will check viewId)

### Permission Enforcement
1. Extract `shareId` from URL path
2. Verify list exists in database
3. For write operations: Verify `shareId` matches (edit permission)
4. For read operations: Accept `shareId` (future: also accept `viewId`)
5. Return 403 Forbidden if permission check fails
6. Return 404 Not Found if list doesn't exist

### Future Enhancement (View-Only Links)
When `viewId` is implemented:
- Generate both `shareId` and `viewId` on list creation
- Check both identifiers in GET endpoint
- Require `shareId` for all write operations
- Return permission-appropriate responses (hide edit UI for view-only users)

---

## API Routes (Next.js App Router)

### GET /api/lists/[shareId]
**Purpose**: Fetch a todo list and its items by shareId
**Permission**: View or Edit (currently only Edit via shareId)

**Request**:
- URL Parameter: `shareId` (string, 9-char alphanumeric)

**Response** (200 OK):
```typescript
{
  list: {
    _id: string;
    shareId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  };
  items: Array<{
    _id: string;
    text: string;
    completed: boolean;
    order: number;
    createdAt: string;
    updatedAt: string;
  }>;
}
```

**Response** (404 Not Found):
```typescript
{ error: "List not found" }
```

**Response** (400 Bad Request):
```typescript
{ error: "Invalid shareId format" }
```

---

### POST /api/lists
**Purpose**: Create a new todo list
**Permission**: None (public endpoint)

**Request Body**:
```typescript
{
  title: string;  // List title (required, max 200 chars)
}
```

**Response** (201 Created):
```typescript
{
  list: {
    _id: string;
    shareId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  };
}
```

**Response** (400 Bad Request):
```typescript
{ error: "Title is required" }
```

---

### PATCH /api/lists/[shareId]
**Purpose**: Update list metadata (e.g., title)

**Request**:
- URL Parameter: `shareId` (string)

**Request Body**:
```typescript
{
  title?: string;  // Optional new title
}
```

**Response** (200 OK):
```typescript
{
  list: {
    _id: string;
    shareId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  };
}
```

---

### POST /api/lists/[shareId]/items
**Purpose**: Add a new item to a list

**Request**:
- URL Parameter: `shareId` (string)

**Request Body**:
```typescript
{
  text: string;  // Item text (required)
}
```

**Response** (201 Created):
```typescript
{
  item: {
    _id: string;
    text: string;
    completed: boolean;
    order: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

**Response** (404 Not Found):
```typescript
{ error: "List not found" }
```

---

### PATCH /api/lists/[shareId]/items/[itemId]
**Purpose**: Update an existing item

**Request**:
- URL Parameters: `shareId` (string), `itemId` (string)

**Request Body**:
```typescript
{
  text?: string;       // Optional new text
  completed?: boolean; // Optional completion status
  order?: number;      // Optional new order
}
```

**Response** (200 OK):
```typescript
{
  item: {
    _id: string;
    text: string;
    completed: boolean;
    order: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

---

### DELETE /api/lists/[shareId]/items/[itemId]
**Purpose**: Delete an item

**Request**:
- URL Parameters: `shareId` (string), `itemId` (string)

**Response** (204 No Content):
- Empty body

**Response** (404 Not Found):
```typescript
{ error: "Item not found" }
```

---

## Component Architecture

### Page Structure
```
/                           → Create new list or redirect to existing
/[shareId]                  → View/edit shared todo list
```

### Component Hierarchy
```
app/
├── page.tsx                → Landing page (create new list)
├── [shareId]/
│   └── page.tsx            → Todo list view/edit page
└── api/
    └── lists/
        ├── route.ts                    → POST /api/lists
        ├── [shareId]/
        │   ├── route.ts                → GET, PATCH /api/lists/[shareId]
        │   └── items/
        │       ├── route.ts            → POST /api/lists/[shareId]/items
        │       └── [itemId]/
        │           └── route.ts        → PATCH, DELETE /api/lists/[shareId]/items/[itemId]

components/
├── TodoList.tsx            → List container with header and items
├── TodoItem.tsx            → Individual todo item (checkbox, text, delete)
├── AddTodoForm.tsx         → Form to add new items
└── ShareLink.tsx           → Display and copy shareable URL
```

### Key Component Responsibilities

#### `TodoList` Component
- Fetches list and items from API
- Manages client-side state
- Handles periodic refresh (polling)
- Renders header, items, and add form

#### `TodoItem` Component
- Displays single item with checkbox and text
- Handles toggle completion
- Handles delete action
- Pure UI component (no direct API calls)

#### `AddTodoForm` Component
- Input field and submit button
- Validates and submits new items
- Clears input on success

#### `ShareLink` Component
- Displays shareable URL
- Copy-to-clipboard functionality
- Visual feedback on copy

---

## URL Structure

### Shareable Links
- Format: `https://domain.com/[shareId]`
- Example: `https://example.com/abc123xyz`
- Share ID: 9-character alphanumeric string (lowercase + numbers)

### Share ID Generation
```typescript
// Generate unique 9-character ID
function generateShareId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
```

---

## Database Layer

### Connection Management
```typescript
// lib/mongodb.ts
import { MongoClient, ObjectId } from 'mongodb';

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

### Type-safe Collections
```typescript
// lib/db-types.ts
import { ObjectId } from 'mongodb';

export interface TodoListDocument {
  _id: ObjectId;
  shareId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TodoItemDocument {
  _id: ObjectId;
  listId: ObjectId;
  text: string;
  completed: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## State Management

### Client-Side State
- **Local state**: React `useState` for form inputs, UI toggles
- **Server state**: Fetched via API and stored in component state
- **Sync strategy**: Polling every 5 seconds for collaborative updates

### Optimistic Updates
For better UX, implement optimistic updates:
1. Update local state immediately
2. Send API request
3. On error, revert local state and show error message

---

## Error Handling

### API Responses
- **200**: Success with data
- **201**: Created with new resource
- **204**: Success with no content
- **400**: Bad request (invalid input)
- **404**: Resource not found
- **500**: Server error

### Client-Side Error Display
- Toast notifications for errors
- Inline validation messages for forms
- Retry mechanisms for network failures

---

## Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=collab-todo
```

---

## Future Extensions

### Prepared for:
1. **User accounts**: Add `ownerId` field to TodoList
2. **Permissions**: Add `permissions` array to TodoList
3. **Real-time sync**: WebSocket support via Next.js server
4. **Audit logs**: Add `history` collection for change tracking

### Non-breaking Changes:
- Additional fields can be added to documents
- New API endpoints can be introduced
- UI components designed to be composable and reusable
