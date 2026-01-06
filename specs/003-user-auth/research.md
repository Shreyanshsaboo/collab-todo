# Research: Authentication & Authorization

**Feature**: 003-user-auth  
**Date**: 2026-01-06  
**Status**: Complete

## Overview

This document consolidates research findings for implementing secure authentication and authorization in the collaborative to-do application. All technical decisions are based on industry best practices, security standards, and project constitution v3.0.0 requirements.

---

## Decision 1: Password Hashing Algorithm

### Decision: **bcrypt with cost factor 12**

### Rationale

**Evaluated Options**:
1. **bcrypt** - Adaptive hash function designed for passwords, widely used, battle-tested
2. **argon2** - Modern algorithm, winner of Password Hashing Competition 2015
3. **PBKDF2** - Older standard, computationally less expensive
4. **scrypt** - Memory-hard function, good resistance to hardware attacks

**Selected: bcrypt**

**Why chosen**:
- Mature and battle-tested (20+ years in production use)
- Excellent npm ecosystem support (`bcrypt` package, 2M+ weekly downloads)
- Adaptive cost factor allows future-proofing as hardware improves
- Cost factor 12 provides strong security (2^12 = 4,096 iterations)
- Automatic salt generation and management
- Constant-time comparison built-in
- Widely understood by security auditors
- Sufficient for web application threat model

**Why not argon2**:
- While technically superior (resistant to GPU/ASIC attacks), added complexity not justified for v1
- Smaller ecosystem, fewer production examples
- Memory-hardness benefits most relevant for high-value targets (not typical for todo app)
- Can migrate later if threat model changes

**Why not PBKDF2/scrypt**:
- PBKDF2: Older, less resistant to specialized hardware attacks
- scrypt: Good option but bcrypt more common in Node.js ecosystem

**Implementation details**:
- Use `bcrypt` npm package (native bindings for performance)
- Cost factor: 12 (required by constitution, provides ~250ms hash time on modern hardware)
- Automatic salt generation (bcrypt handles this internally)
- Use `bcrypt.compare()` for constant-time verification

**References**:
- OWASP Password Storage Cheat Sheet recommends bcrypt
- Constitution v3.0.0 requires cost factor ≥ 12

---

## Decision 2: Session Management Strategy

### Decision: **JWT with HTTP-only cookies**

### Rationale

**Evaluated Options**:
1. **HTTP-only cookies with server-side sessions** - Store session ID in cookie, session data in database
2. **JWT in HTTP-only cookies** - Stateless tokens, all data in signed token
3. **JWT in Authorization header** - Client stores JWT in localStorage/memory
4. **Refresh token + short-lived access token** - Separate tokens for security/convenience

**Selected: JWT in HTTP-only cookies**

**Why chosen**:
- **Stateless**: No database lookups on every request (better performance)
- **Serverless-compatible**: Works with Next.js API routes in serverless environments
- **Secure by default**: HTTP-only cookies prevent XSS theft
- **CSRF protection**: SameSite=Strict prevents cross-site attacks
- **Simple**: No session store needed (MongoDB not required for sessions)
- **Standard**: JWT is industry standard with mature libraries
- **Self-contained**: Token includes all needed claims (userId, expiration)

**Why not server-side sessions**:
- Requires database lookup on every request (performance impact)
- Requires session cleanup jobs for expired sessions
- More complex in serverless deployments
- Added database dependency for sessions

**Why not JWT in Authorization header**:
- Client must manage token storage (localStorage = XSS risk, memory = lost on refresh)
- Requires explicit token management code in frontend
- More complex for server-rendered pages (no token on initial render)

**Why not refresh tokens (v1)**:
- Added complexity not justified for 24-hour session expiration
- Refresh token rotation requires database state (defeats stateless benefit)
- Can add in future if needed (architecture supports it)

**Implementation details**:
- Use `jsonwebtoken` npm package for JWT signing/verification
- Payload: `{ userId: string, email: string, iat: number, exp: number }`
- Secret: Environment variable `JWT_SECRET` (minimum 256 bits, cryptographically random)
- Expiration: 24 hours (as per constitution)
- Cookie settings: `httpOnly: true, secure: true (production), sameSite: 'strict', path: '/'`
- Cookie name: `auth_token`

**Trade-offs accepted**:
- Cannot revoke tokens before expiration (acceptable for v1 with 24-hour expiration)
- Token size larger than session ID (negligible for web app, typical JWT ~200 bytes)
- Clock skew issues (mitigated by reasonable expiration window)

**References**:
- OWASP Session Management Cheat Sheet
- Constitution v3.0.0 requires secure session state

---

## Decision 3: Email Validation

### Decision: **HTML5 email input + basic regex validation**

### Rationale

**Evaluated Options**:
1. **HTML5 email input only** - Browser native validation
2. **Regex validation** - Server-side pattern matching
3. **Email validation library** (e.g., `validator`, `email-validator`)
4. **DNS MX record lookup** - Verify email domain has mail server

**Selected: HTML5 email input + regex validation**

**Why chosen**:
- **Client-side**: HTML5 `<input type="email">` provides immediate UX feedback
- **Server-side**: Regex validation prevents malformed submissions
- **Standard**: RFC 5322 compliant regex (simplified for practical use)
- **Zero dependencies**: No external libraries needed
- **Fast**: No network lookups or complex parsing
- **Good enough**: Catches 99% of typos without over-engineering

**Why not library**:
- Added dependency for minimal value (email validation is well-understood)
- Most libraries use similar regex patterns internally
- Can add later if edge cases emerge

**Why not DNS lookup**:
- Slow (network latency)
- Fails for valid temporary domains
- Overkill for todo app use case
- Can't verify user owns email anyway (no email verification in v1)

**Implementation details**:
- Client: `<input type="email" required />`
- Server regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (simple, catches most errors)
- Additional checks: trim whitespace, convert to lowercase for storage
- Max length: 254 characters (RFC 5321 limit)

**Trade-offs accepted**:
- Some technically valid but unusual email formats may be rejected (acceptable)
- No verification that email is real or owned by user (deferred to future email verification feature)

**References**:
- RFC 5322 (Internet Message Format)
- HTML Living Standard (email input type)

---

## Decision 4: Rate Limiting Strategy

### Decision: **In-memory rate limiting with IP address and email tracking**

### Rationale

**Evaluated Options**:
1. **In-memory rate limiting** - Store counters in server memory
2. **Redis-based rate limiting** - Distributed rate limiting with Redis
3. **Nginx/CDN rate limiting** - Infrastructure-level rate limiting
4. **Database-based rate limiting** - Store attempt counts in MongoDB

**Selected: In-memory rate limiting**

**Why chosen**:
- **Simple**: No additional infrastructure (Redis, reverse proxy config)
- **Fast**: No network calls or database queries
- **Sufficient for v1**: Serverless functions have short lifetimes, limiting memory growth
- **Zero cost**: No additional services required
- **Development-friendly**: Works in local dev without setup

**Why not Redis**:
- Requires additional service (cost, complexity)
- Overkill for v1 scale (moderate concurrent users)
- Not needed unless deploying to multi-instance clusters

**Why not infrastructure-level**:
- Requires proxy configuration (Nginx, Cloudflare)
- Less flexible (hard to customize rules per endpoint)
- Can add later as additional layer

**Why not database**:
- Slow (database round-trip on every request)
- Creates noise in database logs
- Doesn't prevent DDoS (still hits database)

**Implementation details**:
- **Signup rate limit**: Track by IP address
  - Limit: 3 attempts per IP per hour
  - Storage: `Map<IP, {count: number, resetAt: number}>`
  - Reset: Clear counter after 1 hour
- **Signin rate limit**: Track by email address
  - Limit: 5 attempts per email per 15 minutes
  - Storage: `Map<email, {count: number, resetAt: number}>`
  - Reset: Clear counter after 15 minutes
- **Cleanup**: Periodically remove expired entries (e.g., every 5 minutes)
- **Response**: HTTP 429 Too Many Requests with `Retry-After` header

**Trade-offs accepted**:
- Rate limits not shared across serverless function instances (acceptable, limits are per-instance)
- Counters lost on function cold start (acceptable for v1, limits are lenient)
- IP-based limiting can affect users behind NAT (acceptable, signup limit is generous)

**References**:
- OWASP Rate Limiting Guide
- Constitution v3.0.0: signup 3/hour, signin 5/15min

---

## Decision 5: Authorization Middleware Architecture

### Decision: **Centralized middleware with permission resolver**

### Rationale

**Evaluated Options**:
1. **Centralized middleware** - Single auth middleware + permission resolver utility
2. **Route-level decorators** - Each route implements own auth checks
3. **Higher-order functions** - Wrap route handlers with auth logic
4. **Custom route wrappers** - Framework-specific auth wrappers

**Selected: Centralized middleware**

**Why chosen**:
- **DRY**: Single source of truth for auth logic
- **Testable**: Isolated unit for testing auth/authz
- **Maintainable**: Changes to auth logic in one place
- **Constitution compliant**: Explicitly requires centralized auth logic
- **Clear separation**: Auth/authz logic separate from business logic
- **Composable**: Can chain multiple middleware (logging, auth, validation)

**Architecture**:
```
Request → Next.js Middleware → Auth Middleware → Permission Resolver → Route Handler
```

**Components**:
1. **`lib/middleware/auth.ts`**: Extract and verify JWT from cookie
2. **`lib/auth.ts`**: Permission resolver (check ownership, edit link, view link)
3. **API Route**: Call auth middleware, then permission resolver with specific requirements

**Why not route-level**:
- Duplicates auth code across routes
- Easy to forget auth checks (security risk)
- Hard to ensure consistent behavior

**Why not decorators/HOF**:
- TypeScript decorators experimental
- Less explicit than middleware pattern
- Harder to understand flow for maintainers

**Implementation details**:
- Auth middleware: Extracts JWT, verifies signature, adds `userId` to request context
- Permission resolver: Takes (userId, shareId, requiredPermission) → boolean
- Permission types: `'owner' | 'edit' | 'view'`
- Priority: Check owner first (skip link checks), then check links

**Example usage**:
```typescript
export async function DELETE(req: Request, { params }: { params: { shareId: string } }) {
  const { userId } = await requireAuth(req); // throws 401 if no auth
  await requirePermission(params.shareId, userId, 'owner'); // throws 403 if not owner
  // ... delete list logic
}
```

**References**:
- Constitution v3.0.0: MUST centralize authorization logic
- Next.js middleware documentation

---

## Decision 6: User Dashboard vs Direct Navigation

### Decision: **User dashboard page for owned lists**

### Rationale

**Evaluated Options**:
1. **User dashboard** - Dedicated page showing user's owned lists
2. **Direct navigation** - Users bookmark individual list URLs
3. **Sidebar navigation** - Global sidebar with user's lists

**Selected: User dashboard**

**Why chosen**:
- **Ownership visibility**: Clear view of what user owns
- **Discovery**: Easy to find and access owned lists
- **Standard pattern**: Users expect "my account" or "dashboard" in authenticated apps
- **User Story 3**: Spec explicitly requires dashboard view ("viewing my lists dashboard")
- **Future extensibility**: Central place for account management, settings, etc.

**Why not direct navigation**:
- No central view of owned lists
- Relies on bookmarks (poor UX for new users)
- Doesn't leverage authentication benefits

**Why not sidebar**:
- Takes screen real estate on every page
- Complex for mobile responsive design
- Not needed if dashboard provides good list access

**Implementation details**:
- Route: `/dashboard` (protected, requires authentication)
- Displays: Grid/list of owned lists with titles, created dates, item counts
- Actions: Click to open list, create new list, delete list
- Empty state: Prompt to create first list

**Trade-offs accepted**:
- Additional page to build (acceptable, simple CRUD page)
- Adds navigation step (user → dashboard → list) vs direct link (acceptable, bookmarks still work)

**References**:
- User Story 3 in spec.md: "viewing my lists dashboard"
- Common pattern in authenticated web applications

---

## Decision 7: Migration Strategy for Existing Lists

### Decision: **Defer to future feature, document in Out of Scope**

### Rationale

**Evaluated Options**:
1. **Migrate all to anonymous user** - Create system user, assign all existing lists
2. **Claim on access** - First authenticated user to access list becomes owner
3. **Leave orphaned** - Lists remain accessible only via share links
4. **Defer to future** - Document as known issue, handle in separate feature

**Selected: Defer to future feature**

**Why chosen**:
- **Complexity**: Migration logic is non-trivial and error-prone
- **Scope**: Not mentioned in specification requirements
- **Risk**: Wrong migration strategy could lose data or break existing links
- **Time**: v1 can ship without migration (existing lists still work via links)
- **Reversibility**: Can implement proper migration strategy after gathering user feedback

**Interim behavior**:
- Existing lists (no userId): Accessible via shareId/viewId only
- Cannot be deleted (no owner)
- Can still be edited via edit link (existing functionality preserved)
- Show message: "This list was created before user accounts. Claim ownership?" (future feature)

**Why not anonymous user**:
- Creates fake system user (conceptual clutter)
- No way to transfer ownership to real user later
- Doesn't reflect actual ownership history

**Why not claim on access**:
- Race conditions (multiple users could claim)
- Unfair (first user "steals" list from creator)
- Complex authorization logic (current owner OR claimable by authenticated user)

**Why not leave orphaned**:
- Same as "defer" but without plan for future migration
- Selected option documents intent to address later

**Implementation details**:
- Add `userId?: ObjectId` field to TodoList (optional for backward compatibility)
- Lists without userId: Skip ownership checks (fall through to link checks)
- Future migration feature: `/api/lists/[shareId]/claim` endpoint
- Document in spec.md "Out of Scope" section (done)

**References**:
- Edge case documented in spec.md: "existing lists (created before auth system) have no owner"
- Constitution principle: Backward Compatible Link-Based Sharing

---

## Summary of Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Password Hashing | bcrypt (cost 12) | Battle-tested, excellent ecosystem, meets constitution requirements |
| Session Management | JWT + HTTP-only cookies | Stateless, serverless-compatible, secure by default |
| Email Validation | HTML5 + regex | Simple, fast, sufficient for v1 |
| Rate Limiting | In-memory tracking | Simple, fast, no dependencies, sufficient for v1 |
| Authorization | Centralized middleware | DRY, testable, constitution compliant |
| User Dashboard | Dedicated page | Standard pattern, supports ownership visibility |
| Existing Lists | Defer migration | Reduces v1 scope, preserves existing functionality |

---

## Open Questions / Future Research

**None** - All technical decisions finalized for v1 implementation.

Future enhancements to research separately:
- Refresh token rotation strategy (for session extension beyond 24 hours)
- Redis-based distributed rate limiting (for multi-region deployment)
- OAuth provider integration (Google, GitHub sign-in)
- Email verification service integration (SendGrid, AWS SES)
- Password reset token generation and email delivery
- Account deletion and data export (GDPR compliance)

---

## References

1. **OWASP Guides**:
   - Password Storage Cheat Sheet
   - Session Management Cheat Sheet
   - Authentication Cheat Sheet
   - Rate Limiting Guide

2. **Standards**:
   - RFC 5322: Internet Message Format
   - RFC 7519: JSON Web Token (JWT)
   - RFC 5321: Simple Mail Transfer Protocol

3. **Libraries**:
   - `bcrypt` npm package documentation
   - `jsonwebtoken` npm package documentation
   - Next.js middleware documentation

4. **Project**:
   - Constitution v3.0.0 (Authentication principles)
   - Feature Specification (003-user-auth/spec.md)
