# Implementation Plan: View-Only Access Links

**Branch**: `002-view-only-links` | **Date**: 2026-01-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-view-only-links/spec.md`

## Summary

Add view-only access control to collaborative todo lists by generating unique viewId identifiers alongside existing shareId (edit) identifiers. View-only links enable read-only sharing while edit links maintain full read/write access. Permission enforcement occurs at the API layer with server-side validation on all write operations. UI adapts based on detected permission level by hiding edit controls for view-only users.

**Technical Approach**: Extend TodoList document schema with optional `viewId` field, modify API routes to accept both shareId and viewId, implement permission detection logic, add 403 Forbidden responses for unauthorized writes, and update UI components to conditionally render edit controls based on permission context.

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode  
**Primary Dependencies**: Next.js 16+, React 19+, MongoDB driver 6+, TailwindCSS 4+  
**Storage**: MongoDB 8+ with TodoList and TodoItem collections  
**Testing**: Manual testing + TypeScript compilation validation  
**Target Platform**: Web application (Next.js App Router, serverless-compatible API routes)
**Project Type**: Web application with frontend and backend collocated in Next.js App Router  
**Performance Goals**: <200ms API response time, handle viewId generation with <0.0001% collision rate  
**Constraints**: Backward compatibility with existing lists (must support lists without viewId), maintain serverless compatibility for API routes  
**Scale/Scope**: Small feature addition (~300 LOC), affects 6 existing API routes + 2 UI components, adds 1 database field with unique index

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Link-Based Access Control ✅
- **Requirement**: Generate cryptographically random identifiers for view and edit links
- **Compliance**: Feature generates viewId using same `crypto.randomBytes()` method as shareId (9-char alphanumeric)
- **Requirement**: Validate permissions on every write operation
- **Compliance**: FR-005 mandates permission validation on all write operations (POST, PATCH, DELETE) with 403 Forbidden for viewId
- **Requirement**: Do not rely on client-side permission checks alone
- **Compliance**: FR-007 enforces permission distinction at API route level; UI hiding is supplementary
- **Requirement**: Return appropriate HTTP status codes
- **Compliance**: 403 Forbidden for permission denied, 404 for not found, 400 for invalid format

### Principle II: Backend as Single Source of Truth ✅
- **Requirement**: All state mutations occur server-side
- **Compliance**: Permission checks happen in API routes before any database operations
- **Requirement**: Validate all inputs server-side
- **Compliance**: Existing validation (title length, text length) remains; viewId format validation added
- **Requirement**: Enforce permissions in API routes, not just UI
- **Compliance**: FR-005 explicit requirement for API-level enforcement
- **Requirement**: Update timestamps on mutations
- **Compliance**: FR-010 ensures updatedAt only changes on actual writes, not permission checks

### Principle III: Explicit Specifications Before Implementation ✅
- **Requirement**: Create spec document before code
- **Compliance**: spec.md completed with 3 prioritized user stories, 10 functional requirements, 8 success criteria
- **Requirement**: Include user stories with acceptance criteria
- **Compliance**: 3 user stories (P1-P3) with 10 total acceptance scenarios
- **Requirement**: Document API contracts
- **Compliance**: Will generate OpenAPI spec in Phase 1 (contracts/api.openapi.yaml)
- **Requirement**: Identify edge cases and error scenarios
- **Compliance**: 5 edge cases identified with resolution strategies

### Principle IV: Clear Separation of Concerns ✅
- **Requirement**: Data Layer uses MongoDB types
- **Compliance**: viewId stored as string in TodoListDocument; ObjectId and Date types preserved
- **Requirement**: API Layer handles validation, permissions, serialization
- **Compliance**: Permission detection in API routes; serialization via existing serializeTodoList()
- **Requirement**: UI Layer manages local state and optimistic updates
- **Compliance**: UI receives permission prop and conditionally renders; polling remains unchanged
- **Requirement**: Define TypeScript interfaces for each layer
- **Compliance**: Will extend TodoListDocument, add Permission type in db-types.ts

### Principle V: TypeScript Everywhere ✅
- **Requirement**: Strict type checking enabled
- **Compliance**: Project already uses strict: true in tsconfig.json
- **Requirement**: Define interfaces for all API request/response
- **Compliance**: Will extend GetListResponse to include permission field
- **Requirement**: Type all function parameters and return values
- **Compliance**: All new functions will follow existing typing patterns
- **Requirement**: Avoid `any` type
- **Compliance**: No `any` usage planned; use specific types (Permission enum, string literals)

### Principle VI: Simplicity First, Extensibility Later ✅
- **Requirement**: Start with simplest solution
- **Compliance**: Two permission levels only (view, edit); no complex ACL or role hierarchies
- **Requirement**: Justify complexity additions
- **Compliance**: Permission system is minimal; adds one field and simple if/else logic
- **Requirement**: Avoid premature optimization
- **Compliance**: Uses existing polling (5-second intervals); no WebSocket upgrade
- **Requirement**: Defer features not in specification
- **Compliance**: Out of scope clearly defined (no permission revocation, expiration, rotation)

**Constitution Compliance Summary**: ✅ ALL PRINCIPLES SATISFIED  
**Gate Status**: PASS - Proceed to Phase 0 Research

## Project Structure

### Documentation (this feature)

```text
specs/002-view-only-links/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (in progress)
├── research.md          # Phase 0 output (next)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.openapi.yaml
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
collab-todo/
├── app/
│   ├── api/
│   │   └── lists/
│   │       ├── route.ts                           # POST /api/lists (update: add viewId generation)
│   │       └── [shareId]/
│   │           ├── route.ts                       # GET /api/lists/[id] (update: accept viewId)
│   │           │                                  # PATCH /api/lists/[id] (update: check permission)
│   │           └── items/
│   │               ├── route.ts                   # POST (update: check permission)
│   │               └── [itemId]/
│   │                   └── route.ts               # PATCH/DELETE (update: check permission)
│   ├── list/
│   │   └── [shareId]/
│   │       └── page.tsx                           # Update: detect viewId, pass permission prop
│   └── page.tsx                                   # Landing page (no changes)
├── components/
│   ├── TodoListClient.tsx                         # Update: accept permission prop, conditional rendering
│   ├── ShareLink.tsx                              # Update: display both edit and view-only links
│   ├── TodoItemComponent.tsx                      # Update: hide edit/delete based on permission
│   ├── EditListTitle.tsx                          # Update: hide based on permission
│   └── AddItemForm.tsx                            # Update: hide based on permission
├── lib/
│   ├── mongodb.ts                                 # No changes
│   ├── db-types.ts                                # Update: add viewId to TodoListDocument
│   │                                              # Add Permission enum
│   │                                              # Extend GetListResponse with permission field
│   └── utils.ts                                   # Update: add isValidViewId() function
│                                                  # Update: add detectPermission() function
└── .specify/
    └── memory/
        └── constitution.md                        # Reference: Constitution v2.0.0
```

**Structure Decision**: Single Next.js App Router structure with collocated API routes. Frontend (React components) and backend (API routes) share TypeScript types from lib/db-types.ts. Database layer accessed via lib/mongodb.ts. This matches existing 001-collab-todo-link implementation pattern.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: N/A - No constitution violations detected

All six constitution principles passed validation. No complexity justification required.

---

## Phase 0: Research & Analysis

**Output**: [research.md](./research.md) ✅

### Research Artifacts Generated

| Document | Purpose | Status |
|---|---|---|
| research.md | Technical decisions and trade-offs | ✅ Complete |

**Key Decisions Documented**:
1. **Permission Detection Strategy**: URL path with database lookup (Option 1) - maintains clean URLs, backward compatible
2. **ViewId Generation Timing**: On list creation (Option 1) - simplifies logic, avoids race conditions
3. **Permission Enforcement Pattern**: Inline checks in routes (Option 2) - explicit, App Router compatible
4. **UI Conditional Rendering**: Permission prop (Option 1) - explicit data flow, testable
5. **Database Index Strategy**: Unique sparse index on viewId (Option 1) - mirrors shareId pattern, efficient queries
6. **Migration Strategy**: Lazy generation on first access - zero downtime, simple implementation

---

## Phase 1: Design & Contracts

**Prerequisites**: research.md complete ✅

### Phase 1 Artifacts

| Document | Purpose | Status |
|---|---|---|
| data-model.md | Entity definitions and TypeScript interfaces | ✅ Complete |
| contracts/api.openapi.yaml | OpenAPI 3.1 specification for updated endpoints | ✅ Complete |
| quickstart.md | Developer setup and testing guide | ✅ Complete |

**Data Model Summary**:
- **TodoList**: Add optional `viewId: string` field with unique sparse index
- **TodoItem**: No changes required
- **New Types**: `Permission = 'view' | 'edit'` literal type
- **Indexes**: `{ viewId: 1 }` unique sparse index added

**API Contract Updates**:
- All 6 endpoints documented with permission requirements
- 403 Forbidden responses added for unauthorized writes
- Permission field added to GET /api/lists/[id] response
- Security scheme documented (link-based access control)

**Agent Context Updated**: ✅
- Updated `.github/agents/copilot-instructions.md` with:
  - TypeScript 5.x with strict mode
  - Next.js 16+, React 19+, MongoDB driver 6+, TailwindCSS 4+
  - MongoDB 8+ with TodoList and TodoItem collections

---

## Constitution Re-Check (Post-Design)

*Required after Phase 1 design is complete*

### Design Validation Against Constitution v2.0.0

All six principles remain satisfied after detailed design:

✅ **Link-Based Access Control**: viewId uses same cryptographic randomness as shareId (crypto.randomBytes), permission checks on all writes, 403 responses documented in OpenAPI spec

✅ **Backend as Source of Truth**: Permission detection in API routes via database lookup, not URL inspection client-side, all mutations server-validated

✅ **Explicit Specifications**: research.md documents 6 key decisions with rationales, data-model.md defines entities/interfaces, contracts/api.openapi.yaml specifies all endpoints, quickstart.md provides test scenarios

✅ **Separation of Concerns**: Data layer (viewId field in TodoListDocument), API layer (permission validation in routes), UI layer (permission prop for conditional rendering) clearly separated

✅ **TypeScript Everywhere**: All interfaces defined (Permission type, TodoListDocument extension, GetListResponse update), strict mode enforced, no `any` types introduced

✅ **Simplicity First**: Two permission levels only (view/edit), no ACL complexity, reuses existing shareId generation logic, lazy migration strategy avoids downtime

**Final Gate Status**: ✅ PASS - Ready for Phase 2 (Task Breakdown)

---

## Summary of Deliverables

### Documentation Complete ✅
- [x] Feature specification (spec.md)
- [x] Implementation plan (plan.md - this file)
- [x] Research decisions (research.md)
- [x] Data model (data-model.md)
- [x] API contracts (contracts/api.openapi.yaml)
- [x] Developer quickstart (quickstart.md)

### Agent Context Updated ✅
- [x] GitHub Copilot instructions updated with feature technologies

### Next Steps
1. **Run `/speckit.tasks`** to generate task breakdown (tasks.md)
2. **Run `/speckit.implement`** to execute implementation
3. **Validate against constitution** during implementation
4. **Test with quickstart.md** scenarios

---

## Branch Information

**Branch**: `002-view-only-links`  
**Base**: `main`  
**Specification**: [specs/002-view-only-links/spec.md](./spec.md)  
**Implementation Plan**: This file  
**Constitution**: [.specify/memory/constitution.md](../../.specify/memory/constitution.md) v2.0.0
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
