<!--
Sync Impact Report - Constitution Update
===========================================
Version Change: 2.0.0 → 3.0.0

Modified Principles:
- Purpose: Fundamental shift from link-only access to user authentication + link-based sharing
- Added new principle: Authentication and Identity Management
- Added new principle: Authorization as Explicit Policy
- Replaced "Link-Based Access Control" with "Authentication-First Access Model"
- Updated "Backend as Single Source of Truth" to include auth validation
- Updated Technical Stack Requirements to include auth dependencies
- Completely revised Permission Architecture for authenticated users
- Updated Scope Constraints to include auth in v1
- Updated Evolution Policy to support ownership and permission management

Added Sections:
- Authentication and Identity Management principle
- Authorization as Explicit Policy principle
- Authentication Architecture section
- Security Requirements section
- Password and session management rules

Removed Sections:
- Link-Based Access Control as primary principle (preserved as secondary mechanism)
- "No Authentication" constraint

Templates Requiring Updates:
✅ plan-template.md - Generic template, no updates needed
✅ spec-template.md - Generic template, no updates needed
✅ tasks-template.md - Generic template, no updates needed
⚠ Architecture docs MUST be updated to reflect auth layer
⚠ API contract docs MUST include authentication requirements
⚠ Data model docs MUST include User entity and ownership relationships

Follow-up TODOs:
- Implement User authentication system (signup, signin, sessions/tokens)
- Add password hashing with bcrypt or argon2
- Update TodoList model to include userId (owner) field
- Add authentication middleware to all protected routes
- Create authorization checks that validate user owns list OR has link permission
- Update all API routes to accept and validate auth tokens/sessions
- Add UI components for signup, signin, and session management
- Update client-side state management to include user context
- Add permission checks: ownership > edit link > view link hierarchy
- Update data migration for existing lists (assign to anonymous or first user)

Change Rationale:
- MAJOR version bump (2.0.0 → 3.0.0): Backward-incompatible governance change
- Fundamentally changes application architecture from anonymous link-sharing to authenticated user model
- All APIs must now validate user identity before processing requests
- Data model changes require migration of existing lists
- This represents a complete shift in security model and access control philosophy
- Existing link-based permission system is retained but subordinate to ownership
- Cannot be achieved through minor version as it requires breaking changes to API contracts
-->

# Collab Todo Constitution

## Core Principles

### I. Authentication and Identity Management
User identity MUST be established through secure authentication (signup/signin) before accessing owned resources. Authentication verifies who the user is, but does not automatically grant access to all resources.

**Rationale**: Establishes trust and accountability, enables ownership tracking, provides audit trails, and allows personalized experiences while maintaining backward compatibility with link-based sharing.

**Non-negotiable rules**:
- MUST store passwords as cryptographic hashes (bcrypt, argon2, or equivalent with cost factor ≥ 12)
- MUST NEVER store plaintext or reversibly encrypted passwords
- MUST use secure session tokens or JWTs with appropriate expiration
- MUST validate authentication on all protected routes
- MUST implement rate limiting on authentication endpoints (max 5 attempts per 15 minutes)
- MUST provide password requirements (minimum 8 characters, complexity rules TBD)
- MUST implement signup and signin flows
- MUST maintain session state (cookies, tokens, or similar)

### II. Authorization as Explicit Policy
Authentication establishes identity; authorization determines what actions that identity can perform. Authorization MUST be enforced server-side for every operation on every resource.

**Rationale**: Separates "who you are" (authentication) from "what you can do" (authorization), enabling fine-grained access control and preventing unauthorized actions by authenticated users.

**Non-negotiable rules**:
- MUST check authorization AFTER authentication (authenticated user may not be authorized for this resource)
- MUST enforce ownership checks: only list owner can perform ownership-specific operations
- MUST enforce link permission checks: edit link allows writes, view link allows reads only
- MUST centralize authorization logic in reusable middleware/functions
- MUST return HTTP 401 Unauthorized for missing/invalid auth
- MUST return HTTP 403 Forbidden for valid auth but insufficient permissions
- MUST prioritize authorization hierarchy: ownership > edit link > view link
- MUST log authorization failures for security monitoring

### III. Backward Compatible Link-Based Sharing
While authentication is required for list ownership, shareable links (shareId for edit, viewId for view-only) MUST continue to function for collaborative access without requiring recipients to authenticate.

**Rationale**: Preserves core collaborative value proposition of instant sharing while adding user ownership layer. Recipients can access shared lists via links, but owners must authenticate to manage their lists.

**Non-negotiable rules**:
- MUST generate cryptographically random shareIds and viewIds (9+ character alphanumeric)
- MUST allow unauthenticated access via valid edit/view links
- MUST enforce permission hierarchy: owner (full control) > edit link (read/write) > view link (read only)
- MUST validate link permissions on every operation
- MUST associate each list with an authenticated owner (userId)
- MUST allow owners to revoke or regenerate links (future enhancement)

### IV. Backend as Single Source of Truth
All state mutations and security validations MUST occur server-side. The backend enforces authentication, authorization, input validation, and data consistency.

**Rationale**: Prevents client-side tampering, ensures all users see consistent state, and centralizes security enforcement to prevent bypass attacks.

**Non-negotiable rules**:
- MUST validate authentication tokens/sessions on every protected route
- MUST validate authorization (ownership or link permissions) on every operation
- MUST validate all inputs server-side (title length, text length, data types)
- MUST NOT trust client-side authentication or authorization state
- MUST update timestamps (createdAt, updatedAt) on all mutations
- MUST return sanitized, serialized data (ObjectId → string, Date → ISO)
- MUST use HTTPS in production to protect session tokens

### V. Explicit Specifications Before Implementation
Every feature requires a formal specification documenting purpose, acceptance criteria, API contracts, and edge cases before any code is written.

**Rationale**: Prevents scope creep, clarifies requirements, enables better planning, and provides a reference for testing and validation.

**Non-negotiable rules**:
- MUST create spec document in `specs/[number]-[feature-name]/spec.md`
- MUST include user stories with acceptance criteria
- MUST document API contracts (OpenAPI preferred) including auth requirements
- MUST document security considerations (authentication, authorization, data protection)
- MUST identify edge cases and error scenarios including auth failures
- MUST obtain approval before implementation begins

### VI. Clear Separation of Concerns
Architecture MUST maintain distinct layers:
- **Data Layer**: MongoDB documents with ObjectId types, Date objects, User/TodoList relationships
- **API Layer**: RESTful routes with authentication, authorization, validation, serialization
- **UI Layer**: React components with user context, session state, optimistic updates

**Rationale**: Enables independent testing, simplifies debugging, allows layer-specific optimizations, and facilitates future refactoring.

**Non-negotiable rules**:
- MUST NOT perform database operations in UI components
- MUST NOT perform business logic (auth, authorization, validation) in UI components
- MUST serialize MongoDB types (ObjectId → string) at API boundary
- MUST define TypeScript interfaces for each layer (Document, API, Client)
- MUST centralize authentication logic (no duplicate auth checks scattered across codebase)
- MUST centralize authorization logic in reusable middleware or helper functions

### VII. TypeScript Everywhere
Use TypeScript across the entire stack with strict type checking enabled. Define explicit interfaces for all data structures.

**Rationale**: Catches errors at compile time, improves IDE support, serves as living documentation, and prevents common JavaScript pitfalls.

**Non-negotiable rules**:
- MUST use `strict: true` in tsconfig.json
- MUST define interfaces for all API request/response bodies including auth payloads
- MUST define interfaces for User, Session, and Auth-related entities
- MUST type all function parameters and return values
- MUST NOT use `any` type without explicit justification comment

### VIII. Simplicity First, Extensibility Later
Start with the simplest solution that satisfies requirements. Avoid premature optimization or over-engineering for hypothetical future needs.

**Rationale**: YAGNI principle reduces complexity, accelerates delivery, and prevents building features that may never be needed.

**Non-negotiable rules**:
- MUST justify complexity additions with concrete use cases
- MUST use session-based auth OR stateless JWT (choose one, document decision)
- MUST use bcrypt/argon2 for password hashing (no custom crypto)
- MUST use polling (5-second intervals) over WebSockets for v1 sync
- MUST defer features not in current specification (e.g., OAuth, MFA, role-based access)

## Technical Stack Requirements

### Mandatory Technologies
- **Frontend**: Next.js 16+ App Router, React 19+, TypeScript 5+
- **Backend**: Next.js API Routes (serverless-compatible)
- **Database**: MongoDB 8+ with official driver
- **Styling**: TailwindCSS 4+
- **Password Hashing**: bcrypt or argon2
- **Session/Token Management**: TBD (HTTP-only cookies or JWT in Authorization header)

### Technology Rationale
- **Next.js App Router**: Server-side rendering, file-based routing, collocated API routes, middleware for auth
- **MongoDB**: Document model fits user and todo list structures, flexible schema for evolution
- **TailwindCSS**: Utility-first approach speeds development, avoids CSS conflicts
- **bcrypt/argon2**: Industry-standard password hashing algorithms with configurable cost factors

### Prohibited Technologies (for v1)
- WebSocket libraries (Socket.io, Pusher, etc.) - use polling instead
- Social auth providers (Google, GitHub, etc.) - email/password only in v1
- GraphQL - REST API sufficient for current needs
- ORMs (Mongoose, Prisma, etc.) - use MongoDB driver directly
- Custom cryptography implementations - use established libraries only
- Multi-factor authentication (MFA) - defer to future version

## Authentication Architecture

### User Registration (Signup)
**Flow**: Client submits email + password → Backend validates format → Hash password with bcrypt/argon2 → Create User document → Generate session/token → Return auth credentials

**Validation Rules**:
- Email: MUST be valid format, MUST be unique (case-insensitive)
- Password: MUST be minimum 8 characters (additional requirements TBD)
- MUST rate limit signup endpoint (max 3 signups per IP per hour)

### User Authentication (Signin)
**Flow**: Client submits email + password → Backend finds User by email → Verify password hash → Generate session/token → Return auth credentials

**Security Rules**:
- MUST use constant-time comparison for password verification
- MUST rate limit signin endpoint (max 5 attempts per 15 minutes)
- MUST log failed authentication attempts
- MUST invalidate old sessions on new signin (optional for v1)

### Session/Token Management
**Options** (choose one in implementation spec):
1. **HTTP-only cookies** (recommended for server-side rendering):
   - Set `HttpOnly`, `Secure`, `SameSite=Strict` flags
   - Store session ID in cookie, session data in database or signed token
   - CSRF protection via SameSite or tokens
2. **JWT in Authorization header**:
   - Store JWT client-side (localStorage or memory)
   - Include in `Authorization: Bearer <token>` header
   - Use short expiration times (15-60 minutes), refresh tokens optional

**Non-negotiable rules**:
- MUST expire sessions/tokens (max 24 hours for v1)
- MUST validate session/token on every protected API call
- MUST use HTTPS in production (sessions/tokens exposed over HTTP are insecure)
- MUST provide signout endpoint that invalidates sessions/tokens

### Authorization Hierarchy
```
Owner (authenticated user who created list)
  └─ Full control: read, write, delete list and items, manage links
     └─ Edit Link (shareId)
        └─ Read/write: view list, add/edit/delete items (no list deletion)
           └─ View Link (viewId)
              └─ Read-only: view list and items only
```

**Permission Resolution**:
- If user is authenticated AND owns list → grant owner permissions
- Else if valid edit link (shareId) provided → grant edit permissions
- Else if valid view link (viewId) provided → grant view permissions
- Else → HTTP 401/403

## Data Model Updates

### User Document
```typescript
interface UserDocument {
  _id: ObjectId;
  email: string;              // Unique, case-insensitive index
  passwordHash: string;       // bcrypt/argon2 hash
  createdAt: Date;
  updatedAt: Date;
}
```

### TodoList Document (Updated)
```typescript
interface TodoListDocument {
  _id: ObjectId;
  userId: ObjectId;           // NEW: Owner reference
  shareId: string;            // Edit link identifier
  viewId: string;             // View-only link identifier
  title: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Session Document (if using session-based auth)
```typescript
interface SessionDocument {
  _id: ObjectId;
  userId: ObjectId;
  token: string;              // Session identifier
  expiresAt: Date;
  createdAt: Date;
}
```

## API Authentication Matrix

| Endpoint | Method | Auth Required | Authorization Check |
|----------|--------|---------------|-------------------|
| `/api/auth/signup` | POST | No | N/A |
| `/api/auth/signin` | POST | No | N/A |
| `/api/auth/signout` | POST | Yes | Validate session/token |
| `/api/auth/me` | GET | Yes | Validate session/token |
| `/api/lists` | POST | Yes | Create list owned by authenticated user |
| `/api/lists` | GET | Yes | Return lists owned by authenticated user |
| `/api/lists/[shareId]` | GET | No* | Validate ownership OR edit link OR view link |
| `/api/lists/[shareId]` | PATCH | No* | Validate ownership OR edit link |
| `/api/lists/[shareId]` | DELETE | Yes | Validate ownership only |
| `/api/lists/[shareId]/items` | POST | No* | Validate ownership OR edit link |
| `/api/lists/[shareId]/items/[itemId]` | PATCH | No* | Validate ownership OR edit link |
| `/api/lists/[shareId]/items/[itemId]` | DELETE | No* | Validate ownership OR edit link |

*No = Not required if valid link provided, but owner gets elevated permissions if authenticated

## Security Requirements

### Password Security
- MUST use bcrypt (cost ≥ 12) or argon2 (memory ≥ 19MB, iterations ≥ 2)
- MUST validate password complexity (minimum 8 characters; additional rules TBD)
- MUST NOT log, display, or transmit passwords in plaintext
- MUST NOT email passwords (password reset requires secure token flow in future)

### Session/Token Security
- MUST use cryptographically secure random values (crypto.randomBytes or equivalent)
- MUST set appropriate expiration times (≤ 24 hours for v1)
- MUST use HTTPS in production
- MUST set `HttpOnly`, `Secure`, `SameSite=Strict` for cookies (if using cookies)
- MUST NOT store sensitive data in JWT payload if using JWTs

### Input Validation
- MUST sanitize all user inputs (email, password, title, text)
- MUST validate email format with regex or library
- MUST validate password length and complexity
- MUST limit string lengths (title ≤ 200 chars, item text ≤ 500 chars)
- MUST reject malicious inputs (SQL injection patterns, script tags if rendering HTML)

### Rate Limiting
- MUST rate limit authentication endpoints:
  - Signup: 3 per IP per hour
  - Signin: 5 per email per 15 minutes
- SHOULD rate limit other endpoints (defer to future version if complex)

### Audit Logging
- MUST log authentication events (signup, signin, signout, failures)
- MUST log authorization failures (403 errors)
- MUST include timestamp, IP address, user agent in logs
- MUST NOT log passwords or session tokens

## Permission Architecture

### Permission Types (Preserved from v2.0.0)
1. **Owner Permission**: Full control (authenticated user who created list)
2. **Edit Permission**: Read/write access via shareId link
3. **View Permission**: Read-only access via viewId link

### Permission Enforcement Flow (Updated)
```
Client Request → API Route → Extract auth token/session → Verify user identity (if present) →
Extract shareId/viewId → Verify list exists → Check operation type → 
If DELETE list: require ownership → 
Else if write operation: require ownership OR edit link → 
Else if read operation: require ownership OR edit link OR view link → 
Execute operation → Return response
```

## Scope Constraints

### Included in v1
- Email and password-based authentication
- Secure password hashing (bcrypt/argon2)
- Session or JWT-based session management
- User signup and signin flows
- List ownership (userId reference)
- Backward-compatible link-based sharing
- Authorization hierarchy (owner > edit link > view link)

### Explicitly Excluded from v1
- Social authentication (Google, GitHub, etc.)
- Multi-factor authentication (MFA)
- Password reset functionality (requires email service)
- Email verification
- Account deletion
- Profile management
- Role-based access control (RBAC)
- Permission delegation/sharing with other users
- Real-time WebSockets (use polling)

## Evolution Policy

### Future Enhancements
The architecture must allow future addition of:
- Password reset via email with secure tokens
- Email verification during signup
- Social authentication providers (OAuth)
- Multi-factor authentication (TOTP, SMS)
- Ownership transfer (transfer list to another user)
- Permission revocation (invalidate links)
- Explicit user-to-user sharing (share with user by email)
- Role-based access control (viewer, editor, admin roles)
- Real-time collaboration (WebSockets, Server-Sent Events)
- User profiles and preferences
- Account deletion with data export

### Migration Path
- Existing lists without userId: assign to special "anonymous" user or migrate on first authenticated access
- Existing sessions: invalidate on auth system deployment
- Database indexes: add unique index on User.email (case-insensitive)
- API contracts: versioning strategy TBD if breaking changes needed

## Development Workflow

### Feature Development Process
1. **Specification**: Create spec in `specs/[number]-[feature]/spec.md` (include auth requirements)
2. **Planning**: Generate implementation plan with research, data model, contracts
3. **Task Breakdown**: Create task list with dependencies and parallelization markers
4. **Implementation**: Execute tasks incrementally with validation at each step
5. **Validation**: Run build, tests, security checks, manual testing before completion

### Quality Gates
- MUST pass TypeScript compilation (`npm run build`)
- MUST validate against constitution principles (manual review)
- MUST test all authentication scenarios (signup, signin, signout, invalid credentials)
- MUST test all authorization scenarios (owner, edit link, view link, no permission)
- MUST test edge cases documented in specification
- MUST verify password hashing (never stored in plaintext)
- MUST verify session/token security (expiration, secure flags)

### Code Review Requirements
- Verify authentication validation on all protected routes
- Verify authorization checks on all operations (ownership and link permissions)
- Verify input validation on all API routes
- Verify password handling (no logging, no plaintext storage)
- Verify session/token security (secure flags, expiration)
- Verify error handling returns appropriate HTTP status codes (401, 403)
- Verify TypeScript types match data model documentation

## Governance

### Amendment Process
1. Propose changes with rationale and impact analysis
2. Update this constitution document with version bump
3. Propagate changes to dependent artifacts (templates, docs, code)
4. Document migration path for breaking changes

### Version Bump Rules
- **MAJOR**: Backward-incompatible governance changes (e.g., adding authentication system)
- **MINOR**: New principles, sections, or material expansions
- **PATCH**: Clarifications, wording fixes, non-semantic improvements

### Compliance Review
- Review constitution alignment before starting each new feature
- Validate adherence during implementation (checklist in spec)
- Post-implementation audit for security and architectural compliance
- All feature specifications MUST include a "Constitution Check" section verifying alignment with core principles, technical stack, permission architecture, and development workflow

### Conflict Resolution
When specification conflicts with constitution:
1. Constitution takes precedence
2. If specification requirement is valid, amend constitution first
3. Update specification to align with amended constitution

### Constitution Metadata
- **Version**: 3.0.0
- **Ratification Date**: 2026-01-06 (first adoption with authentication system)
- **Last Amended**: 2026-01-06
- **Next Review**: 2026-04-06 (quarterly review)
