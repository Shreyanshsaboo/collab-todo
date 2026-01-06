# Data Model: Authentication & Authorization

**Feature**: 003-user-auth  
**Date**: 2026-01-06  
**Status**: Complete

## Overview

This document defines the data model for user authentication and list ownership. The design extends the existing TodoList/TodoItem collections with User entity and ownership references, while maintaining backward compatibility with existing link-based access patterns.

---

## Collections

### User Collection

Stores authenticated user accounts with securely hashed passwords.

**Collection Name**: `users`

#### Document Structure

```typescript
interface UserDocument {
  _id: ObjectId;              // MongoDB-generated unique identifier
  email: string;              // User's email address (unique, lowercase)
  passwordHash: string;       // bcrypt hash (cost factor 12, includes salt)
  createdAt: Date;            // Account creation timestamp
  updatedAt: Date;            // Last account update timestamp
}
```

#### Field Specifications

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `_id` | ObjectId | Yes | Auto-generated | Primary key, unique identifier |
| `email` | string | Yes | Unique, 5-254 chars, lowercase, valid email format | User's email address |
| `passwordHash` | string | Yes | 60 chars (bcrypt format) | bcrypt hashed password with salt |
| `createdAt` | Date | Yes | Auto-set on creation | When account was created |
| `updatedAt` | Date | Yes | Auto-update on modification | When account was last modified |

#### Indexes

```typescript
// Unique index on email (case-insensitive)
db.users.createIndex(
  { email: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);
```

**Rationale**: Email is the primary identifier for authentication. Case-insensitive unique index prevents duplicate accounts with different casing (e.g., `User@Example.com` vs `user@example.com`).

#### Validation Rules

- **email**:
  - Format: Valid email regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
  - Length: 5-254 characters (RFC 5321)
  - Storage: Always stored lowercase
  - Unique: Enforced by database index
- **passwordHash**:
  - Format: bcrypt hash string (60 characters)
  - Never store plaintext passwords
  - Generated with cost factor 12
- **Timestamps**:
  - Stored as JavaScript Date objects
  - Serialized to ISO 8601 strings in API responses

#### Example Document

```typescript
{
  _id: ObjectId("65a1b2c3d4e5f6a7b8c9d0e1"),
  email: "alice@example.com",
  passwordHash: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU8M0b0Q0YqG",
  createdAt: ISODate("2026-01-06T10:30:00.000Z"),
  updatedAt: ISODate("2026-01-06T10:30:00.000Z")
}
```

---

### TodoList Collection (Updated)

Extended with owner reference to support list ownership while maintaining backward compatibility.

**Collection Name**: `todolists`

#### Updated Document Structure

```typescript
interface TodoListDocument {
  _id: ObjectId;              // MongoDB-generated unique identifier
  userId?: ObjectId;          // NEW: Owner reference (optional for backward compatibility)
  shareId: string;            // Edit link identifier (9-char alphanumeric)
  viewId: string;             // View-only link identifier (9-char alphanumeric)
  title: string;              // List title
  createdAt: Date;            // List creation timestamp
  updatedAt: Date;            // Last modification timestamp
}
```

#### New/Updated Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `userId` | ObjectId | **No** | References User._id | Owner of the list (optional for old lists) |

**All other fields unchanged from existing schema.**

#### Updated Indexes

```typescript
// NEW: Index on userId for efficient user dashboard queries
db.todolists.createIndex({ userId: 1 });

// EXISTING: Unique indexes on shareId and viewId remain unchanged
db.todolists.createIndex({ shareId: 1 }, { unique: true });
db.todolists.createIndex({ viewId: 1 }, { unique: true });
```

**Rationale**: User dashboard needs to efficiently query all lists owned by a user. Index on `userId` enables fast lookups without full collection scan.

#### Backward Compatibility

- **userId is optional**: Existing lists (created before auth system) have no userId
- **Old lists behavior**: Still accessible via shareId/viewId, cannot be deleted (no owner)
- **New lists requirement**: All lists created by authenticated users MUST have userId
- **Migration strategy**: Deferred to future feature (documented in research.md)

#### Authorization Logic

```typescript
function canPerformAction(list: TodoListDocument, userId?: string, linkType?: 'edit' | 'view', action: 'read' | 'write' | 'delete'): boolean {
  // Owner check (highest priority)
  if (userId && list.userId?.equals(userId)) {
    return true; // Owner can do anything
  }
  
  // Link permission check (fallback)
  if (action === 'delete') {
    return false; // Only owner can delete
  }
  if (action === 'write') {
    return linkType === 'edit'; // Edit link required for writes
  }
  if (action === 'read') {
    return linkType === 'edit' || linkType === 'view'; // Any valid link for reads
  }
  
  return false; // No permission
}
```

#### Example Documents

**New list with owner**:
```typescript
{
  _id: ObjectId("65a1b2c3d4e5f6a7b8c9d0e2"),
  userId: ObjectId("65a1b2c3d4e5f6a7b8c9d0e1"), // References alice@example.com
  shareId: "aBc123XyZ",
  viewId: "xYz987AbC",
  title: "Team Sprint Tasks",
  createdAt: ISODate("2026-01-06T11:00:00.000Z"),
  updatedAt: ISODate("2026-01-06T11:00:00.000Z")
}
```

**Old list without owner (backward compatible)**:
```typescript
{
  _id: ObjectId("65a0a1a2a3a4a5a6a7a8a9a0"),
  // userId: undefined (field not present)
  shareId: "dEf456UvW",
  viewId: "pQr321StU",
  title: "Grocery Shopping",
  createdAt: ISODate("2025-12-15T08:00:00.000Z"),
  updatedAt: ISODate("2025-12-20T09:30:00.000Z")
}
```

---

### TodoItem Collection (Unchanged)

No changes to TodoItem schema. Items belong to lists, ownership is inherited through list relationship.

**Collection Name**: `todoitems`

#### Document Structure (Reference)

```typescript
interface TodoItemDocument {
  _id: ObjectId;              // MongoDB-generated unique identifier
  listId: ObjectId;           // Reference to TodoList._id
  text: string;               // Task description
  completed: boolean;         // Completion status
  order: number;              // Display order
  createdAt: Date;            // Item creation timestamp
  updatedAt: Date;            // Last modification timestamp
}
```

**No schema changes required.** Authorization for items is determined by the parent list's permissions.

---

## Relationships

### User ↔ TodoList (One-to-Many)

- **Relationship**: One user can own multiple lists
- **Implementation**: TodoList.userId references User._id
- **Cardinality**: 1 User → 0..* TodoLists
- **Referential integrity**: Application-enforced (MongoDB has no foreign key constraints)
- **Cascade behavior**: User deletion TBD (deferred to future account deletion feature)

### TodoList ↔ TodoItem (One-to-Many)

**Unchanged from existing schema.**

- **Relationship**: One list contains multiple items
- **Implementation**: TodoItem.listId references TodoList._id
- **Cardinality**: 1 TodoList → 0..* TodoItems
- **Cascade delete**: When list is deleted, all its items must be deleted (application-enforced)

---

## API Type Definitions

TypeScript interfaces for API request/response bodies (serialized from MongoDB documents).

### API Types

```typescript
// API response type for User (excludes passwordHash)
export interface UserAPI {
  _id: string;              // ObjectId → string
  email: string;
  createdAt: string;        // Date → ISO string
  updatedAt: string;        // Date → ISO string
}

// API response type for TodoList (extends existing)
export interface TodoListAPI {
  _id: string;              // ObjectId → string
  userId?: string;          // NEW: ObjectId → string (optional)
  shareId: string;
  viewId: string;
  title: string;
  createdAt: string;        // Date → ISO string
  updatedAt: string;        // Date → ISO string
}

// TodoItemAPI unchanged from existing
export interface TodoItemAPI {
  _id: string;              // ObjectId → string
  text: string;
  completed: boolean;
  order: number;
  createdAt: string;        // Date → ISO string
  updatedAt: string;        // Date → ISO string
}

// Authentication request/response types
export interface SignupRequest {
  email: string;            // Valid email format
  password: string;         // Minimum 8 characters
}

export interface SigninRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserAPI;
  // JWT set as HTTP-only cookie, not returned in body
}

export interface AuthErrorResponse {
  error: string;            // Human-readable error message
}
```

### Serialization Rules

**MongoDB Document → API Response**:
1. `ObjectId` → `string`: Convert using `.toString()`
2. `Date` → `string`: Convert using `.toISOString()`
3. Remove sensitive fields: Never include `passwordHash` in API responses
4. Remove internal fields: Never include MongoDB internal fields (`__v`, etc.)

**Example Serialization**:
```typescript
function serializeUser(doc: UserDocument): UserAPI {
  return {
    _id: doc._id.toString(),
    email: doc.email,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString()
    // passwordHash intentionally omitted
  };
}
```

---

## Data Flow Diagrams

### User Signup Flow

```
1. Client submits { email, password }
   ↓
2. API validates email format & password length
   ↓
3. Check if email already exists (unique constraint)
   ↓
4. Hash password with bcrypt (cost 12)
   ↓
5. Create User document { email, passwordHash, timestamps }
   ↓
6. Insert into users collection
   ↓
7. Generate JWT with { userId, email, exp: 24h }
   ↓
8. Set HTTP-only cookie with JWT
   ↓
9. Return { user: UserAPI } (exclude passwordHash)
```

### User Signin Flow

```
1. Client submits { email, password }
   ↓
2. API validates email format & password length
   ↓
3. Find user by email (case-insensitive)
   ↓
4. If not found → return "Invalid credentials" (don't reveal if email exists)
   ↓
5. Verify password with bcrypt.compare() (constant-time)
   ↓
6. If invalid → return "Invalid credentials"
   ↓
7. Generate JWT with { userId, email, exp: 24h }
   ↓
8. Set HTTP-only cookie with JWT
   ↓
9. Return { user: UserAPI }
```

### List Creation Flow (Authenticated)

```
1. Client submits { title } with auth cookie
   ↓
2. Extract JWT from cookie, verify signature
   ↓
3. Extract userId from JWT payload
   ↓
4. Generate cryptographically random shareId & viewId
   ↓
5. Create TodoList document { userId, shareId, viewId, title, timestamps }
   ↓
6. Insert into todolists collection
   ↓
7. Return { list: TodoListAPI } with userId field populated
```

### List Authorization Flow

```
1. Client requests list operation (read/write/delete) with optional auth cookie
   ↓
2. Extract shareId/viewId from URL
   ↓
3. Find TodoList by shareId or viewId
   ↓
4. If JWT present → verify and extract userId
   ↓
5. Check authorization:
   - If userId matches list.userId → GRANT (owner)
   - Else if operation=delete → DENY (only owner can delete)
   - Else if operation=write → CHECK if shareId (edit link)
   - Else if operation=read → CHECK if shareId or viewId (any valid link)
   ↓
6. If authorized → execute operation
   ↓
7. If not authorized → return 403 Forbidden
```

---

## Migration Considerations

### Phase 1: Add userId Field

**Action**: Add optional `userId` field to TodoList schema
**Impact**: No breaking changes (field is optional)
**Compatibility**: Old lists without userId still function via link access

### Phase 2: Create User Collection

**Action**: Create users collection with indexes
**Impact**: New functionality, no effect on existing data
**Compatibility**: Existing lists remain accessible

### Phase 3: Enforce Owner-Only Delete

**Action**: Update DELETE /api/lists/[shareId] to require authenticated owner
**Impact**: Old lists (no userId) cannot be deleted
**Compatibility**: Breaking change for old lists, but documented limitation

### Future: Claim Ownership

**Deferred to separate feature**:
- Add `/api/lists/[shareId]/claim` endpoint
- Allow authenticated user to claim ownership of list without userId
- Update list with claimer's userId
- Requires additional authorization checks and UX flow

---

## Database Commands

### Create Collections and Indexes

```javascript
// Create users collection with unique email index
db.createCollection("users");
db.users.createIndex(
  { email: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
    name: "unique_email_case_insensitive"
  }
);

// Add userId index to todolists collection (collection already exists)
db.todolists.createIndex(
  { userId: 1 },
  { name: "owner_lists_lookup" }
);

// Existing indexes on todolists (no changes needed):
// - { shareId: 1 } unique
// - { viewId: 1 } unique
// - { listId: 1 } on todoitems
```

### Validation Queries

```javascript
// Verify unique email constraint
db.users.findOne({ email: "test@example.com" });
db.users.insertOne({ email: "Test@Example.com", ... }); // Should fail

// Verify userId index exists
db.todolists.getIndexes();

// Query user's owned lists (should use index)
db.todolists.find({ userId: ObjectId("...") }).explain("executionStats");
// Should show "IXSCAN" stage using "owner_lists_lookup" index

// Verify backward compatibility (lists without userId)
db.todolists.find({ userId: { $exists: false } }).count();
```

---

## Summary

**New Entities**: User  
**Updated Entities**: TodoList (added userId field)  
**Unchanged Entities**: TodoItem  
**New Indexes**: users.email (unique, case-insensitive), todolists.userId  
**Backward Compatibility**: Maintained through optional userId field  
**Migration Path**: Deferred to future feature, documented in research.md

All data model decisions align with Constitution v3.0.0 requirements for secure authentication, authorization hierarchy, and backward-compatible link sharing.
