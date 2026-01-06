# Tasks: Authentication & Authorization

**Input**: Design documents from `/specs/003-user-auth/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth-api.openapi.yaml, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependencies

- [ ] T001 Install bcrypt package: `npm install bcrypt @types/bcrypt`
- [ ] T002 [P] Install jsonwebtoken package: `npm install jsonwebtoken @types/jsonwebtoken`
- [ ] T003 [P] Install validator package: `npm install validator @types/validator`
- [ ] T004 Generate JWT secret using crypto and add to `.env.local` (JWT_SECRET=<256-bit hex>, JWT_EXPIRATION=24h)
- [ ] T005 Create MongoDB indexes for users collection (unique email, case-insensitive) per data-model.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Update `lib/db-types.ts` with UserDocument interface (email, passwordHash, createdAt, updatedAt)
- [ ] T007 [P] Update `lib/db-types.ts` with UserAPI interface (exclude passwordHash)
- [ ] T008 [P] Update TodoListDocument interface in `lib/db-types.ts` to add optional userId field
- [ ] T009 Create `lib/auth.ts` with hashPassword function using bcrypt (cost factor 12)
- [ ] T010 [P] Add verifyPassword function to `lib/auth.ts` using bcrypt.compare
- [ ] T011 [P] Add generateToken function to `lib/auth.ts` using jwt.sign (userId, email payload)
- [ ] T012 [P] Add verifyToken function to `lib/auth.ts` using jwt.verify
- [ ] T013 [P] Add serializeUser function to `lib/auth.ts` (convert UserDocument to UserAPI, exclude passwordHash)
- [ ] T014 Create `lib/middleware/auth.ts` with getAuthContext function (extract JWT from cookie, verify, return userId/email or null)
- [ ] T015 [P] Add requireAuth function to `lib/middleware/auth.ts` (throws if not authenticated)
- [ ] T016 [P] Add checkOwnership function to `lib/middleware/auth.ts` (verify userId matches list.userId)
- [ ] T017 Create `lib/rate-limit.ts` with in-memory rate limiting for signup (3 per IP per hour)
- [ ] T018 [P] Add signin rate limiting to `lib/rate-limit.ts` (5 per email per 15 minutes)
- [ ] T019 [P] Add cleanup interval to `lib/rate-limit.ts` (every 5 minutes, remove expired entries)
- [ ] T020 Add userId index to todolists collection in MongoDB: `db.todolists.createIndex({ userId: 1 })`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Account Creation (Priority: P1) 🎯 MVP

**Goal**: Allow new users to create accounts with email/password, store securely hashed credentials, and establish authenticated sessions

**Independent Test**: Submit signup form with valid email/password → User document created in database with hashed password → Authentication cookie set → Redirected to dashboard

### Implementation for User Story 1

- [ ] T021 [P] [US1] Create `app/signup/page.tsx` with signup page layout
- [ ] T022 [P] [US1] Create `components/SignupForm.tsx` with email/password form (validation: email format, password min 8 chars)
- [ ] T023 [US1] Implement POST handler in `app/api/auth/signup/route.ts` with rate limiting check (checkSignupRateLimit)
- [ ] T024 [US1] Add email validation to signup route (validator.isEmail, case-insensitive uniqueness check)
- [ ] T025 [US1] Add password validation to signup route (min 8 characters)
- [ ] T026 [US1] Hash password in signup route using hashPassword from lib/auth.ts
- [ ] T027 [US1] Insert user document into users collection with normalized email, passwordHash, timestamps
- [ ] T028 [US1] Generate JWT token in signup route using generateToken from lib/auth.ts
- [ ] T029 [US1] Set HTTP-only cookie in signup route response (auth_token, secure in production, SameSite=Strict, maxAge=86400)
- [ ] T030 [US1] Return serialized user object (serializeUser) with 201 Created status
- [ ] T031 [US1] Add error handling in signup route: duplicate email → 400 "Email already registered"
- [ ] T032 [US1] Add error handling in signup route: rate limit exceeded → 429 "Too many signup attempts"
- [ ] T033 [US1] Wire SignupForm to call POST /api/auth/signup and redirect to /dashboard on success
- [ ] T034 [US1] Add error display in SignupForm for validation and server errors
- [ ] T035 [US1] Update landing page `app/page.tsx` with "Sign Up" link to /signup

**Checkpoint**: User Story 1 complete - users can create accounts and get authenticated sessions

---

## Phase 4: User Story 2 - Secure Signin (Priority: P1)

**Goal**: Allow returning users to authenticate with email/password and establish sessions

**Independent Test**: Create user account → Sign out → Sign in with correct credentials → Authentication cookie set → Redirected to dashboard

### Implementation for User Story 2

- [ ] T036 [P] [US2] Create `app/signin/page.tsx` with signin page layout
- [ ] T037 [P] [US2] Create `components/SigninForm.tsx` with email/password form
- [ ] T038 [US2] Implement POST handler in `app/api/auth/signin/route.ts` with rate limiting check (checkSigninRateLimit)
- [ ] T039 [US2] Add email lookup in signin route (case-insensitive, users collection)
- [ ] T040 [US2] Verify password in signin route using verifyPassword from lib/auth.ts (constant-time comparison)
- [ ] T041 [US2] Return same error "Invalid credentials" for both non-existent email and wrong password (prevent email enumeration)
- [ ] T042 [US2] Generate JWT token in signin route using generateToken from lib/auth.ts
- [ ] T043 [US2] Set HTTP-only cookie in signin route response (same config as signup)
- [ ] T044 [US2] Return serialized user object with 200 OK status
- [ ] T045 [US2] Add error handling in signin route: rate limit exceeded → 429 "Too many signin attempts"
- [ ] T046 [US2] Wire SigninForm to call POST /api/auth/signin and redirect to /dashboard on success
- [ ] T047 [US2] Add error display in SigninForm for authentication and rate limit errors
- [ ] T048 [US2] Update landing page `app/page.tsx` with "Sign In" link to /signin

**Checkpoint**: User Story 2 complete - users can sign in and establish authenticated sessions

---

## Phase 5: User Story 3 - List Ownership (Priority: P1)

**Goal**: Associate created lists with authenticated users as owners, enabling list management from user dashboard

**Independent Test**: Sign in → Create new list → List document has userId field → List appears in dashboard → Owner can delete list

### Implementation for User Story 3

- [ ] T049 [P] [US3] Create `app/dashboard/page.tsx` with server-side authentication check (cookies.get, verifyToken)
- [ ] T050 [US3] Query owned lists in dashboard page (todolists collection where userId matches authenticated user)
- [ ] T051 [US3] Display owned lists in dashboard with title, creation date, and link to list page
- [ ] T052 [US3] Add "Create New List" button in dashboard linking to list creation flow
- [ ] T053 [US3] Redirect to /signin from dashboard if no valid auth_token cookie
- [ ] T054 [US3] Update POST handler in `app/api/lists/route.ts` to require authentication (requireAuth middleware)
- [ ] T055 [US3] Associate new list with userId in POST /api/lists (new ObjectId(auth.userId))
- [ ] T056 [US3] Return 401 Unauthorized in POST /api/lists if authentication fails
- [ ] T057 [US3] Create GET handler in `app/api/lists/route.ts` to return authenticated user's owned lists (require auth)
- [ ] T058 [US3] Sort owned lists by updatedAt descending in GET /api/lists
- [ ] T059 [US3] Update DELETE handler in `app/api/lists/[shareId]/route.ts` to require authentication (requireAuth)
- [ ] T060 [US3] Add ownership check in DELETE handler (checkOwnership or manual userId comparison)
- [ ] T061 [US3] Return 403 Forbidden in DELETE handler if user is not owner
- [ ] T062 [US3] Delete list and all associated items in DELETE handler (cascade deletion)
- [ ] T063 [US3] Return 200 OK with success message after deletion
- [ ] T064 [US3] Update list page UI to show delete button only when authenticated user is owner
- [ ] T065 [US3] Wire delete button to call DELETE /api/lists/[shareId] and redirect to dashboard on success

**Checkpoint**: User Story 3 complete - lists are owned by creators, accessible from dashboard, and can be deleted by owners

---

## Phase 6: User Story 4 - Owner Permissions (Priority: P2)

**Goal**: Grant list owners full control (read, write, delete) regardless of access method (dashboard or share link)

**Independent Test**: Sign in as owner → Access list via shareId → Perform all CRUD operations → All succeed without link permission restrictions

### Implementation for User Story 4

- [ ] T066 [P] [US4] Update GET handler in `app/api/lists/[shareId]/route.ts` to allow owner access (check userId before link validation)
- [ ] T067 [P] [US4] Update PATCH handler in `app/api/lists/[shareId]/route.ts` to allow owner access (check userId before link validation)
- [ ] T068 [P] [US4] Update POST handler in `app/api/lists/[shareId]/items/route.ts` to allow owner access
- [ ] T069 [P] [US4] Update PATCH handler in `app/api/lists/[shareId]/items/[itemId]/route.ts` to allow owner access
- [ ] T070 [P] [US4] Update DELETE handler in `app/api/lists/[shareId]/items/[itemId]/route.ts` to allow owner access
- [ ] T071 [US4] Implement authorization hierarchy logic: if authenticated and owner → grant all permissions, else check link permissions
- [ ] T072 [US4] Update list page UI to show owner badge/indicator when authenticated user is owner
- [ ] T073 [US4] Update list page UI to hide view-only restrictions when user is owner (even if accessing via viewId)

**Checkpoint**: User Story 4 complete - owners have unrestricted access to their lists via any access method

---

## Phase 7: User Story 5 - Unauthenticated Link Access (Priority: P2)

**Goal**: Allow unauthenticated users to access lists via shareId (edit) or viewId (view-only) links without creating accounts

**Independent Test**: Create list as authenticated user → Copy shareId link → Access in incognito browser → Can edit items without signing in

### Implementation for User Story 5

- [ ] T074 [P] [US5] Ensure GET handler in `app/api/lists/[shareId]/route.ts` allows unauthenticated access with valid shareId
- [ ] T075 [P] [US5] Ensure POST handler in `app/api/lists/[shareId]/items/route.ts` allows unauthenticated access with valid shareId
- [ ] T076 [P] [US5] Ensure PATCH handler in `app/api/lists/[shareId]/items/[itemId]/route.ts` allows unauthenticated access with valid shareId
- [ ] T077 [P] [US5] Ensure DELETE handler in `app/api/lists/[shareId]/items/[itemId]/route.ts` allows unauthenticated access with valid shareId
- [ ] T078 [P] [US5] Ensure GET handler allows unauthenticated access with valid viewId
- [ ] T079 [US5] Ensure write operations (POST/PATCH/DELETE) with viewId return 403 Forbidden for unauthenticated users
- [ ] T080 [US5] Test shareId link access in incognito browser (no auth cookie) - verify edit operations succeed
- [ ] T081 [US5] Test viewId link access in incognito browser (no auth cookie) - verify read succeeds, writes return 403
- [ ] T082 [US5] Update list page UI to hide owner-only features (delete list button) when user is not authenticated or not owner

**Checkpoint**: User Story 5 complete - link-based collaboration works for unauthenticated users

---

## Phase 8: User Story 6 - Secure Session Management (Priority: P2)

**Goal**: Maintain secure authentication state across requests and allow users to sign out to terminate sessions

**Independent Test**: Sign in → Navigate to different pages → Authentication persists → Sign out → Session invalidated → Protected resources redirect to signin

### Implementation for User Story 6

- [ ] T083 [P] [US6] Create POST handler in `app/api/auth/signout/route.ts` to clear auth_token cookie
- [ ] T084 [P] [US6] Create GET handler in `app/api/auth/me/route.ts` to return current authenticated user (requireAuth)
- [ ] T085 [US6] Set cookie with empty value and maxAge=0 in signout route to clear auth_token
- [ ] T086 [US6] Return 200 OK with success message in signout route
- [ ] T087 [US6] Return 401 Unauthorized in /api/auth/me if no valid auth_token cookie
- [ ] T088 [US6] Create `components/UserNav.tsx` with signout button and user email display
- [ ] T089 [US6] Wire signout button to call POST /api/auth/signout and redirect to landing page
- [ ] T090 [US6] Add UserNav component to app layout or dashboard page header
- [ ] T091 [US6] Test session persistence: sign in → navigate to dashboard → refresh page → verify still authenticated
- [ ] T092 [US6] Test signout flow: sign in → sign out → attempt to access /dashboard → verify redirect to /signin
- [ ] T093 [US6] Test expired session: create JWT with 1-second expiration → wait → verify redirect to /signin on next request
- [ ] T094 [US6] Add session expiration message "Session expired. Please sign in again." when redirecting from expired token

**Checkpoint**: User Story 6 complete - secure session management with signout capability

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T095 [P] Add audit logging to all auth routes (signup, signin, signout) with timestamp, IP, user-agent
- [ ] T096 [P] Add audit logging to authorization failures (401, 403) with attempt details
- [ ] T097 [P] Add input sanitization to all API routes accepting user input (email, password, list titles, item text)
- [ ] T098 [P] Verify HTTPS enforcement in production environment (NODE_ENV check)
- [ ] T099 [P] Add loading states to SignupForm and SigninForm (disable button while submitting)
- [ ] T100 [P] Add password visibility toggle to SignupForm and SigninForm (eye icon)
- [ ] T101 Update README.md with authentication setup instructions (environment variables, MongoDB indexes)
- [ ] T102 Create migration script for existing lists: assign userId field based on migration strategy from data-model.md
- [ ] T103 Add redirect logic: if authenticated user visits /signin or /signup → redirect to /dashboard
- [ ] T104 Test all user stories end-to-end per quickstart.md testing checklist
- [ ] T105 Update .specify/architecture.md to reflect authentication layer and authorization hierarchy
- [ ] T106 Remove "out of date" warning from .specify/architecture.md after update

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User Story 1 (Account Creation): Can start after Foundational - No dependencies on other stories
  - User Story 2 (Secure Signin): Can start after Foundational - No dependencies on other stories (independent signin flow)
  - User Story 3 (List Ownership): Depends on US1 and US2 (requires authentication) - Cannot test without ability to sign in
  - User Story 4 (Owner Permissions): Depends on US3 (requires list ownership) - Extends authorization for owners
  - User Story 5 (Unauthenticated Link Access): Can start after Foundational - Independent of user stories (preserves existing link behavior)
  - User Story 6 (Secure Session Management): Depends on US1 and US2 (requires authentication flows) - Adds signout to existing auth
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies (Critical Path)

```
Setup (Phase 1)
  ↓
Foundational (Phase 2) ← BLOCKS all user stories
  ↓
  ├─→ US1 (Account Creation) ← P1, MVP Foundation
  │     ↓
  ├─→ US2 (Secure Signin) ← P1, MVP Foundation
  │     ↓
  │   US3 (List Ownership) ← P1, MVP Core (requires US1 + US2)
  │     ↓
  │   US4 (Owner Permissions) ← P2, Extends US3
  │
  ├─→ US5 (Unauthenticated Link Access) ← P2, Independent (preserves existing behavior)
  │
  └─→ US6 (Secure Session Management) ← P2, Extends US1 + US2
  
All user stories complete
  ↓
Polish (Phase 9)
```

### MVP Scope (Minimum Viable Product)

**MVP = User Stories 1, 2, 3 (P1 only)**

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1 (Account Creation)
4. Complete Phase 4: User Story 2 (Secure Signin)
5. Complete Phase 5: User Story 3 (List Ownership)
6. **STOP and VALIDATE**: Test core authentication flow end-to-end
7. Deploy MVP if ready

**Deferred to Post-MVP**: User Stories 4, 5, 6 (P2) can be added incrementally after MVP is validated

### Within Each User Story

- Implementation tasks before testing
- Core functionality before UI polish
- API routes before frontend components (enables parallel development)
- Error handling as part of implementation (not deferred)
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks except T004 can run in parallel
- T001, T002, T003: Package installations (parallel)
- T004: Environment variable generation (sequential - must read output)
- T005: MongoDB index creation (parallel with packages)

**Phase 2 (Foundational)**: Significant parallelization possible
- T006, T007, T008: db-types.ts updates (sequential - same file)
- T009-T013: lib/auth.ts functions (sequential - same file, but can scaffold all function signatures first)
- T014-T016: lib/middleware/auth.ts functions (sequential - same file)
- T017-T019: lib/rate-limit.ts functions (sequential - same file)
- T020: MongoDB index (parallel with any lib/ file work)
- Files can be created in parallel: auth.ts, middleware/auth.ts, rate-limit.ts (different files)

**User Story 1**: Frontend and backend can work in parallel
- Frontend: T021 + T022 (page and component - parallel)
- Backend: T023-T032 (signup route - sequential)
- T021, T022 can start while T023-T032 are in progress (different files)
- T033-T035: Frontend integration (after frontend + backend complete)

**User Story 2**: Similar parallelization as US1
- Frontend: T036 + T037 (parallel)
- Backend: T038-T045 (sequential)
- Frontend integration: T046-T048 (after both complete)

**User Story 3**: Dashboard and API updates can work in parallel
- Dashboard: T049-T053 (sequential - same file)
- Lists API: T054-T063 (sequential - same file)
- UI updates: T064-T065 (after API complete)
- T049-T053 can start while T054-T063 are in progress

**User Story 4**: All API updates marked [P] can run in parallel (different handlers)
- T066, T067, T068, T069, T070: Different route files (parallel)
- T071-T073: After API updates complete (sequential)

**User Story 5**: All tasks marked [P] are independent (different handlers or different tests)
- T074-T078: Different route handlers (parallel)
- T079-T082: Testing and UI updates (sequential)

**User Story 6**: API routes and components can work in parallel
- API: T083, T084 (parallel - different routes)
- Frontend: T088 (parallel with API)
- Integration: T085-T094 (after API + frontend complete)

**Phase 9 (Polish)**: Most tasks marked [P] are independent
- T095-T100: Different files or independent changes (parallel)
- T101-T106: Documentation and migration (can run in parallel with code changes)

---

## Parallel Example: User Story 1

```bash
# After Foundational phase complete, launch User Story 1:

# Frontend tasks (parallel):
Task T021: "Create app/signup/page.tsx with signup page layout"
Task T022: "Create components/SignupForm.tsx with email/password form"

# Backend tasks (sequential - same file):
Task T023: "Implement POST handler in app/api/auth/signup/route.ts with rate limiting"
# ... T024-T032 in sequence (same route file)

# After both frontend and backend complete:
Task T033: "Wire SignupForm to call POST /api/auth/signup"
Task T034: "Add error display in SignupForm"
Task T035: "Update landing page with Sign Up link"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Account Creation)
4. **VALIDATE**: Test signup flow end-to-end
5. Complete Phase 4: User Story 2 (Secure Signin)
6. **VALIDATE**: Test signin flow end-to-end
7. Complete Phase 5: User Story 3 (List Ownership)
8. **VALIDATE**: Test complete MVP flow (signup → create list → dashboard → delete list)
9. Deploy/demo MVP if ready

**Post-MVP**: Add User Stories 4, 5, 6 incrementally

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Can create accounts ✓
3. Add User Story 2 → Test independently → Can sign in ✓
4. Add User Story 3 → Test independently → Can own lists ✓ **[MVP COMPLETE]**
5. Add User Story 4 → Test independently → Owner permissions enhanced ✓
6. Add User Story 5 → Test independently → Link collaboration preserved ✓
7. Add User Story 6 → Test independently → Secure session management ✓
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (Days 1-2)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (Account Creation) - Parallel with B
   - **Developer B**: User Story 2 (Secure Signin) - Parallel with A
   - **Developer C**: User Story 5 (Unauthenticated Link Access) - Independent, can start parallel
3. After US1 + US2 complete:
   - **Developer A or B**: User Story 3 (List Ownership) - Requires US1 + US2
4. After US3 complete:
   - **Developer A**: User Story 4 (Owner Permissions) - Extends US3
   - **Developer B**: User Story 6 (Secure Session Management) - Extends US1 + US2
5. Stories integrate independently at merge time

---

## Task Count Summary

- **Phase 1 (Setup)**: 5 tasks
- **Phase 2 (Foundational)**: 15 tasks (CRITICAL - blocks all user stories)
- **Phase 3 (US1 - Account Creation)**: 15 tasks
- **Phase 4 (US2 - Secure Signin)**: 13 tasks
- **Phase 5 (US3 - List Ownership)**: 17 tasks
- **Phase 6 (US4 - Owner Permissions)**: 8 tasks
- **Phase 7 (US5 - Unauthenticated Link Access)**: 9 tasks
- **Phase 8 (US6 - Secure Session Management)**: 12 tasks
- **Phase 9 (Polish)**: 12 tasks

**Total**: 106 tasks

**MVP Tasks (US1 + US2 + US3)**: 5 (Setup) + 15 (Foundational) + 15 (US1) + 13 (US2) + 17 (US3) = **65 tasks for MVP**

**Parallel Opportunities Identified**: 38 tasks marked [P] (can run simultaneously with other tasks)

---

## Notes

- All [P] tasks are in different files or independent operations
- [Story] labels map each task to its user story for traceability
- Each user story is independently completable and testable
- MVP (US1 + US2 + US3) delivers core authentication value
- Post-MVP stories (US4 + US5 + US6) enhance but don't block core functionality
- Foundational phase MUST complete before any user story work begins
- Commit after each task or logical group for incremental progress
- Stop at any checkpoint to validate story independently
- Follow quickstart.md testing checklist for end-to-end validation
