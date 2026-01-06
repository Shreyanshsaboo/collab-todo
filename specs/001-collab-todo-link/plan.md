# Implementation Plan: Collaborative To-Do Application

**Branch**: `001-collab-todo-link` | **Date**: 2026-01-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-collab-todo-link/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a collaborative to-do application where users can create shareable task lists accessible via unique links without authentication. The system uses Next.js with App Router for both frontend and API, MongoDB for persistent storage, and polling-based synchronization to keep multiple users in sync. Key capabilities include creating lists, managing tasks (add/complete/delete), and sharing via URL with automatic 5-second polling for collaborative updates.

## Technical Context

**Language/Version**: TypeScript 5.x with Node.js runtime (Next.js 16+)  
**Primary Dependencies**: Next.js 16+, React 19+, MongoDB driver, TailwindCSS  
**Storage**: MongoDB (version 5+) for persistent storage of lists and tasks  
**Testing**: Manual testing for MVP (automated tests in future iterations)  
**Target Platform**: Web browsers (desktop and mobile), deployed as Next.js application  
**Project Type**: Web application (Next.js full-stack with App Router)  
**Performance Goals**: <2s task operations, <5s list creation, 5-10s sync latency  
**Constraints**: Polling-based sync only (no WebSockets), no authentication required, 500 char task limit  
**Scale/Scope**: Support 10+ concurrent users per list, 100 lists with 50 tasks each without degradation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Link-based Collaboration Over User Accounts
- **Status**: COMPLIANT
- **Evidence**: Feature uses shareId-based URLs for access, no authentication system

### ✅ Backend-driven Shared State
- **Status**: COMPLIANT
- **Evidence**: MongoDB as single source of truth, API routes manage all state mutations

### ✅ Clear Separation of Concerns (UI, API, Data)
- **Status**: COMPLIANT
- **Evidence**: Next.js App Router separates pages (UI), API routes (API), and MongoDB connection (data layer)

### ✅ Explicit Specifications Before Implementation
- **Status**: COMPLIANT
- **Evidence**: This planning phase follows spec.md and produces detailed design before coding

### ✅ Simplicity First, Extensibility Later
- **Status**: COMPLIANT
- **Evidence**: Polling instead of WebSockets, no auth, no permissions - simple MVP with evolution path

### ✅ TypeScript Across Frontend and Backend
- **Status**: COMPLIANT
- **Evidence**: TypeScript 5.x used throughout, Next.js supports TypeScript natively

### ✅ Follow Next.js App Router Conventions
- **Status**: COMPLIANT
- **Evidence**: Using App Router structure (app/page.tsx, app/api/, app/[shareId]/)

### ✅ Prefer RESTful APIs with Predictable Behavior
- **Status**: COMPLIANT
- **Evidence**: REST endpoints follow standard HTTP methods (GET, POST, PATCH, DELETE)

### ✅ Keep Business Logic Out of UI Components
- **Status**: COMPLIANT
- **Evidence**: API routes handle validation, data transformation; components are presentational

### ✅ Use MongoDB ObjectIds as Primary Identifiers
- **Status**: COMPLIANT
- **Evidence**: _id fields use MongoDB ObjectId type for lists and items

### ✅ No User Authentication
- **Status**: COMPLIANT
- **Evidence**: Feature explicitly avoids authentication system

### ✅ No Roles Beyond Link-based Permissions
- **Status**: COMPLIANT
- **Evidence**: Anyone with link has full access, no role system

### ✅ No Real-time WebSockets in v1
- **Status**: COMPLIANT
- **Evidence**: Using 5-second polling for synchronization

### ✅ Architecture Allows Future Extensions
- **Status**: COMPLIANT
- **Evidence**: Data model can add ownerId, permissions arrays; polling can upgrade to WebSockets

**GATE RESULT**: ✅ PASSED - All constitutional requirements met, proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/001-collab-todo-link/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── api.openapi.yaml # OpenAPI 3.0 specification
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Web application (Next.js full-stack)
app/
├── page.tsx                       # Landing page (create new list)
├── [shareId]/
│   └── page.tsx                   # Shared list view/edit page
├── layout.tsx                     # Root layout
├── globals.css                    # Global styles
└── api/
    └── lists/
        ├── route.ts                        # POST /api/lists
        ├── [shareId]/
        │   ├── route.ts                    # GET, PATCH /api/lists/[shareId]
        │   └── items/
        │       ├── route.ts                # POST /api/lists/[shareId]/items
        │       └── [itemId]/
        │           └── route.ts            # PATCH, DELETE /api/lists/[shareId]/items/[itemId]

components/
├── TodoList.tsx           # List container with header and items
├── TodoItem.tsx           # Individual todo item
├── AddTodoForm.tsx        # Form to add new items
└── ShareLink.tsx          # Display and copy shareable URL

lib/
├── mongodb.ts             # Database connection utility
├── db-types.ts            # TypeScript interfaces for documents
└── utils.ts               # Shared utilities (shareId generation, etc.)

tests/                     # Future: automated tests
```

**Structure Decision**: Using Next.js App Router convention with collocated API routes. The `app/` directory contains both pages and API routes, following Next.js 13+ best practices. Component directory is separate from app/ for reusable UI elements. The `lib/` directory contains shared utilities and database logic following separation of concerns principle.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. All constitutional principles are satisfied by the proposed implementation.
