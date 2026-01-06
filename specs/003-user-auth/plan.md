# Implementation Plan: Authentication & Authorization

**Branch**: `003-user-auth` | **Date**: 2026-01-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-user-auth/spec.md`

**Note**: This implementation plan follows the `/speckit.plan` command workflow.

## Summary

Implement secure user authentication system with signup/signin flows using email and password. Add list ownership model where authenticated users own their created lists with full control, while preserving backward-compatible link-based sharing for collaboration. Use JWT-based authentication with HTTP-only cookies, bcrypt for password hashing, and enforce a clear authorization hierarchy: owner (full control) > edit link (read/write) > view link (read-only). System includes rate limiting, security logging, and proper HTTP status codes for auth/authz failures.

## Technical Context

**Language/Version**: TypeScript 5+ / Node.js 18+  
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, bcrypt, jsonwebtoken, MongoDB driver 8+  
**Storage**: MongoDB 8+ (User, Session collections; TodoList updated with userId)  
**Testing**: Manual testing for v1 (automated tests deferred)  
**Target Platform**: Web application (server-side rendering + API routes)  
**Project Type**: Web application (Next.js monolith with collocated frontend and backend)  
**Performance Goals**: 95% of auth operations < 2s, signup < 60s, signin < 30s  
**Constraints**: HTTPS required in production, HTTP-only cookies for security, 24-hour session expiration  
**Scale/Scope**: Support for moderate concurrent users, email/password auth only (no OAuth), no password reset in v1

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Alignment with Core Principles

**✅ I. Authentication and Identity Management**
- Plan uses bcrypt with cost factor ≥ 12 for password hashing ✓
- No plaintext password storage ✓
- JWT with HTTP-only cookies for secure session state ✓
- Authentication validation on all protected routes ✓
- Rate limiting on auth endpoints (5 attempts / 15 min) ✓
- Password minimum 8 characters ✓
- Signup and signin flows included ✓

**✅ II. Authorization as Explicit Policy**
- Server-side authorization checks on every operation ✓
- Ownership checks enforced (only owner can delete list) ✓
- Link permission checks enforced (edit vs view) ✓
- Centralized authorization middleware planned ✓
- HTTP 401 for missing/invalid auth ✓
- HTTP 403 for insufficient permissions ✓
- Authorization hierarchy: owner > edit link > view link ✓
- Authorization failure logging planned ✓

**✅ III. Backward Compatible Link-Based Sharing**
- Cryptographically random shareIds/viewIds preserved ✓
- Unauthenticated access via valid links maintained ✓
- Permission hierarchy enforced ✓
- List ownership association added (userId field) ✓

**✅ IV. Backend as Single Source of Truth**
- All authentication/authorization server-side ✓
- Input validation server-side ✓
- No client-side security reliance ✓
- Proper serialization (ObjectId → string) ✓
- HTTPS enforcement in production ✓

**✅ V. Explicit Specifications Before Implementation**
- Formal specification created (spec.md) ✓
- User stories with acceptance criteria ✓
- API contracts to be documented (OpenAPI) ✓
- Edge cases identified ✓
- Security considerations explicit ✓

**✅ VI. Clear Separation of Concerns**
- Data Layer: User, Session, TodoList documents ✓
- API Layer: Auth routes with validation/authorization ✓
- UI Layer: Signup/signin forms, user context ✓
- No business logic in UI components ✓
- Centralized auth middleware ✓

**✅ VII. TypeScript Everywhere**
- Full TypeScript implementation ✓
- Strict mode enabled ✓
- Interfaces for User, Session, auth payloads ✓
- Type all functions and parameters ✓

**✅ VIII. Simplicity First, Extensibility Later**
- Email/password only (no OAuth) ✓
- bcrypt for hashing (industry standard) ✓
- JWT with HTTP-only cookies (simple session management) ✓
- No password reset in v1 (defer complexity) ✓
- Deferred: OAuth, MFA, refresh tokens ✓

### Technical Stack Compliance

**✅ Mandatory Technologies**
- Next.js 16+ App Router ✓
- React 19+ ✓
- TypeScript 5+ ✓
- MongoDB 8+ ✓
- TailwindCSS 4+ ✓
- bcrypt for password hashing ✓

**✅ Prohibited Technologies (for v1)**
- No WebSocket libraries ✓
- No social auth libraries (NextAuth, Auth0) in v1 ✓
- No GraphQL ✓
- No ORMs (Mongoose, Prisma) ✓

### Security Requirements Compliance

**✅ Password Security**
- bcrypt cost factor ≥ 12 ✓
- Password minimum 8 characters ✓
- No plaintext logging/storage ✓

**✅ Session/Token Security**
- Cryptographically secure tokens ✓
- 24-hour expiration ✓
- HTTPS in production ✓
- HTTP-only cookies ✓

**✅ Input Validation**
- Email format validation ✓
- Password length validation ✓
- SQL injection prevention (NoSQL, but input sanitization) ✓

**✅ Rate Limiting**
- Signup: 3 per IP per hour ✓
- Signin: 5 per email per 15 minutes ✓

**✅ Audit Logging**
- Auth events logged (signup, signin, signout, failures) ✓
- Timestamp, IP, user agent included ✓
- No password/token logging ✓

**GATE STATUS**: ✅ **PASSED** - All constitution principles satisfied, no violations

## Project Structure

### Documentation (this feature)

```text
specs/003-user-auth/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── auth-api.openapi.yaml
├── checklists/
│   └── requirements.md  # Already created
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

This is a Next.js monolith web application with collocated frontend and backend:

```text
app/
├── api/
│   ├── auth/                    # NEW: Authentication endpoints
│   │   ├── signup/
│   │   │   └── route.ts         # POST /api/auth/signup
│   │   ├── signin/
│   │   │   └── route.ts         # POST /api/auth/signin
│   │   ├── signout/
│   │   │   └── route.ts         # POST /api/auth/signout
│   │   └── me/
│   │       └── route.ts         # GET /api/auth/me
│   └── lists/                   # UPDATED: Add auth/authz checks
│       ├── route.ts             # POST (require auth), GET (require auth for owned lists)
│       └── [shareId]/
│           ├── route.ts         # GET (owner or link), PATCH (owner or edit link), DELETE (owner only)
│           └── items/
│               ├── route.ts     # POST (owner or edit link)
│               └── [itemId]/
│                   └── route.ts # PATCH/DELETE (owner or edit link)
├── dashboard/                   # NEW: User dashboard page
│   └── page.tsx                 # Display user's owned lists
├── signin/                      # NEW: Signin page
│   └── page.tsx
├── signup/                      # NEW: Signup page
│   └── page.tsx
└── page.tsx                     # UPDATED: Landing page with auth options

components/
├── SignupForm.tsx               # NEW: Signup form component
├── SigninForm.tsx               # NEW: Signin form component
├── UserNav.tsx                  # NEW: User navigation (signout, profile)
└── [existing components]        # UPDATED: Add auth context awareness

lib/
├── auth.ts                      # NEW: Auth utilities (hash, verify, JWT)
├── middleware/
│   └── auth.ts                  # NEW: Auth middleware for protected routes
├── db-types.ts                  # UPDATED: Add User, Session interfaces
└── [existing files]

middleware.ts                    # NEW: Next.js middleware for auth validation
```

**Structure Decision**: Using Next.js App Router monolith structure (Option 2 variant) where API routes and pages are collocated under `app/` directory. This matches existing project structure and aligns with Next.js 13+ conventions. Authentication logic centralized in `lib/auth.ts` and `lib/middleware/auth.ts` for reusability across API routes. UI components for auth flows under `components/` and new pages under `app/` following existing patterns.

## Complexity Tracking

> **No constitution violations** - This section intentionally left empty as all gates passed.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
