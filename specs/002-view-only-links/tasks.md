# Tasks: View-Only Access Links

**Input**: Design documents from `/specs/002-view-only-links/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are NOT requested in this specification - focusing on implementation only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a Next.js App Router project with collocated API routes and UI components.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Verify Next.js 16+, React 19+, TypeScript 5+ dependencies in package.json
- [X] T002 Verify MongoDB connection in lib/mongodb.ts supports viewId field
- [X] T003 [P] Create MongoDB unique sparse index on viewId field for TodoList collection

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Add viewId field to TodoListDocument interface in lib/db-types.ts
- [X] T005 [P] Add Permission type ('view' | 'edit') to lib/db-types.ts
- [X] T006 [P] Implement generateShareId collision check for cross-collision with viewId in lib/utils.ts
- [X] T007 [P] Add isValidShareId validation function to lib/utils.ts
- [X] T008 Implement detectPermission helper function in lib/utils.ts (takes list and id, returns Permission)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Generate View-Only Links (Priority: P1) 🎯 MVP

**Goal**: Enable list owners to generate view-only links for read-only sharing

**Independent Test**: Create a list via POST /api/lists, verify response includes both shareId and viewId (9-char alphanumeric, distinct values)

### Implementation for User Story 1

- [X] T009 [US1] Update POST /api/lists route in app/api/lists/route.ts to generate viewId alongside shareId
- [X] T010 [US1] Add viewId collision detection to POST /api/lists (check against both shareId and viewId)
- [X] T011 [US1] Update POST /api/lists response to include viewId field in app/api/lists/route.ts
- [X] T012 [US1] Update GET /api/lists/[shareId] route in app/api/lists/[shareId]/route.ts to return viewId field
- [X] T013 [US1] Add lazy viewId generation for existing lists in GET /api/lists/[shareId]/route.ts (if viewId undefined)
- [X] T014 [US1] Update ShareLink component in components/ShareLink.tsx to display both edit and view-only links
- [X] T015 [US1] Add link labels to ShareLink component ("Edit Link" and "View-Only Link")
- [X] T016 [US1] Add copy button for view-only link in components/ShareLink.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional - lists generate both links, users can copy view-only links

---

## Phase 4: User Story 2 - Access List with View-Only Permission (Priority: P2)

**Goal**: Enable collaborators to view tasks using view-only links without seeing edit controls

**Independent Test**: Access /list/[viewId] in browser, verify all tasks visible but no add/edit/delete controls shown

### Implementation for User Story 2

- [X] T017 [US2] Update GET /api/lists/[shareId] route to accept viewId and detect permission using detectPermission helper
- [X] T018 [US2] Update GET /api/lists/[shareId] response to include permission field in app/api/lists/[shareId]/route.ts
- [X] T019 [US2] Update app/list/[shareId]/page.tsx server component to detect permission from API response
- [X] T020 [US2] Pass permission prop to TodoListClient component in app/list/[shareId]/page.tsx
- [X] T021 [US2] Update TodoListClient component in components/TodoListClient.tsx to accept permission prop
- [X] T022 [US2] Conditionally hide AddItemForm in components/TodoListClient.tsx when permission === 'view'
- [X] T023 [US2] Update TodoItemComponent in components/TodoItemComponent.tsx to accept permission prop
- [X] T024 [US2] Conditionally hide edit/delete buttons in components/TodoItemComponent.tsx when permission === 'view'
- [X] T025 [US2] Update EditListTitle component in components/EditListTitle.tsx to accept permission prop
- [X] T026 [US2] Conditionally hide title edit in components/EditListTitle.tsx when permission === 'view'
- [X] T027 [US2] Return 404 Not Found in GET /api/lists/[shareId] when neither shareId nor viewId matches

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - view-only users see read-only UI

---

## Phase 5: User Story 3 - Enforce Edit Permission Restrictions (Priority: P3)

**Goal**: Block write operations at API level for view-only users to ensure security

**Independent Test**: Use curl/Postman to attempt POST/PATCH/DELETE with viewId, verify all return 403 Forbidden

### Implementation for User Story 3

- [X] T028 [US3] Add permission check to PATCH /api/lists/[shareId] route in app/api/lists/[shareId]/route.ts
- [X] T029 [US3] Return 403 Forbidden with error message when permission !== 'edit' in PATCH /api/lists/[shareId]
- [X] T030 [US3] Add permission check to DELETE /api/lists/[shareId] route in app/api/lists/[shareId]/route.ts
- [X] T031 [US3] Return 403 Forbidden when permission !== 'edit' in DELETE /api/lists/[shareId]
- [X] T032 [US3] Add permission check to POST /api/lists/[shareId]/items route in app/api/lists/[shareId]/items/route.ts
- [X] T033 [US3] Return 403 Forbidden when permission !== 'edit' in POST /api/lists/[shareId]/items
- [X] T034 [US3] Add permission check to PATCH /api/lists/[shareId]/items/[itemId] in app/api/lists/[shareId]/items/[itemId]/route.ts
- [X] T035 [US3] Return 403 Forbidden when permission !== 'edit' in PATCH /api/lists/[shareId]/items/[itemId]
- [X] T036 [US3] Add permission check to DELETE /api/lists/[shareId]/items/[itemId] in app/api/lists/[shareId]/items/[itemId]/route.ts
- [X] T037 [US3] Return 403 Forbidden when permission !== 'edit' in DELETE /api/lists/[shareId]/items/[itemId]
- [X] T038 [US3] Verify GET /api/lists/[shareId]/items allows both shareId and viewId (read operations)

**Checkpoint**: All user stories should now be independently functional - security enforced at API level

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T039 [P] Run TypeScript type checking: npm run type-check
- [X] T040 [P] Run linter: npm run lint
- [ ] T041 Test Scenario A from quickstart.md: Create list with dual access (requires running server + MongoDB)
- [ ] T042 Test Scenario B from quickstart.md: Edit permission via shareId (requires running server + MongoDB)
- [ ] T043 Test Scenario C from quickstart.md: View permission via viewId (requires running server + MongoDB)
- [ ] T044 Test Scenario D from quickstart.md: UI conditional rendering (requires running server + MongoDB)
- [ ] T045 Test Edge Case 1 from quickstart.md: Non-existent ID returns 404 (requires running server + MongoDB)
- [ ] T046 Test Edge Case 2 from quickstart.md: Invalid ID format returns 400 (requires running server + MongoDB)
- [ ] T047 Test Edge Case 3 from quickstart.md: Backward compatibility with old lists (requires running server + MongoDB)
- [ ] T048 [P] Verify response time <200ms for GET /api/lists/[id] operations (requires performance testing)
- [X] T049 Update README.md to document view-only links feature
- [X] T050 Verify constitution compliance for all implemented changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P2): Can start after Foundational - No dependencies on US1, but integrates with it
  - User Story 3 (P3): Can start after Foundational - No dependencies on US1/US2, but validates their security
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
  - Independently testable: Create list, verify both IDs generated
  - Delivers: View-only link generation capability
  
- **User Story 2 (P2)**: Can start after Foundational (Phase 2)
  - Independently testable: Access with viewId, verify read-only UI
  - Delivers: View-only user experience
  - Integration: Uses viewId generated by US1, but US1 doesn't need to be complete
  
- **User Story 3 (P3)**: Can start after Foundational (Phase 2)
  - Independently testable: Attempt writes with viewId, verify 403 responses
  - Delivers: Server-side permission enforcement
  - Integration: Validates US1/US2 security, but can be developed independently

### Within Each User Story

- **US1 Tasks**:
  - T009, T010, T011 (POST /api/lists) are sequential
  - T012, T013 (GET /api/lists/[shareId]) are sequential after T009-T011
  - T014, T015, T016 (ShareLink component) can start after T012 completes
  
- **US2 Tasks**:
  - T017, T018 (GET route updates) are sequential
  - T019, T020 (page.tsx) depend on T017, T018
  - T021, T022 (TodoListClient) can run in parallel after T020
  - T023, T024 (TodoItemComponent) can run in parallel with T021, T022
  - T025, T026 (EditListTitle) can run in parallel with T021-T024
  - T027 (404 handling) can run in parallel with T021-T026
  
- **US3 Tasks**:
  - All permission checks (T028-T037) can run in parallel
  - T038 (verify GET still works) should run after at least one check is implemented

### Parallel Opportunities

- **Phase 1 (Setup)**: T002 and T003 can run in parallel
- **Phase 2 (Foundational)**: T005, T006, T007 can run in parallel after T004
- **Phase 3 (US1)**: T014, T015, T016 (ShareLink updates) can run in parallel
- **Phase 4 (US2)**: T023-T026 (component updates) can run in parallel
- **Phase 5 (US3)**: T028-T037 (all permission checks) can run in parallel
- **Phase 6 (Polish)**: T039, T040 can run in parallel; T041-T047 (tests) can run in parallel after implementation complete; T048, T049, T050 can run in parallel

---

## Parallel Example: User Story 1

```bash
# After Foundational phase completes:

# Sequential: API route changes
1. Implement T009, T010, T011 (POST /api/lists with viewId generation)
2. Implement T012, T013 (GET /api/lists/[shareId] with viewId return)

# Parallel: UI updates
3. Then run in parallel:
   - T014: Update ShareLink component structure
   - T015: Add link labels
   - T016: Add copy button

# Result: US1 complete and independently testable
```

---

## Parallel Example: User Story 3

```bash
# After Foundational phase completes (US1 and US2 can be in progress or complete):

# Parallel: All permission checks
Run all in parallel (different API route files):
- T028, T029: PATCH /api/lists/[shareId]
- T030, T031: DELETE /api/lists/[shareId]
- T032, T033: POST /api/lists/[shareId]/items
- T034, T035: PATCH /api/lists/[shareId]/items/[itemId]
- T036, T037: DELETE /api/lists/[shareId]/items/[itemId]

# Sequential: Verification
- T038: Verify GET operations still work with both IDs

# Result: US3 complete and independently testable
```

---

## Implementation Strategy

### MVP Scope (Recommended First Deliverable)

**User Story 1 only** (Tasks T001-T016):
- Generate view-only links
- Display both edit and view-only links
- ~50 LOC, 2 API routes, 1 UI component
- Deliverable: Users can generate and share view-only links
- Testing: Create list, verify both links generated and copyable

### Incremental Delivery Path

1. **Phase 1-2**: Setup + Foundational (T001-T008) - ~30 LOC
2. **Phase 3**: User Story 1 (T009-T016) - ~50 LOC - **First deployable increment**
3. **Phase 4**: User Story 2 (T017-T027) - ~100 LOC - **Second deployable increment**
4. **Phase 5**: User Story 3 (T028-T038) - ~80 LOC - **Third deployable increment** 
5. **Phase 6**: Polish (T039-T050) - Testing and validation

### Team Parallel Strategy

If multiple developers available:
- **Dev 1**: Phase 1-2 (Foundational) → US1 (T009-T016)
- **Dev 2**: Wait for Phase 2 → US2 (T017-T027) in parallel with Dev 1's US1
- **Dev 3**: Wait for Phase 2 → US3 (T028-T038) in parallel with Dev 1/2

If single developer:
- Proceed sequentially: Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3) → Phase 6

---

## Summary

**Total Tasks**: 50  
**Task Breakdown**:
- Setup: 3 tasks
- Foundational: 5 tasks
- User Story 1 (P1): 8 tasks
- User Story 2 (P2): 11 tasks
- User Story 3 (P3): 11 tasks
- Polish: 12 tasks

**Parallel Opportunities**: 20 tasks can run in parallel (marked with [P] or within phases)

**Independent Test Criteria**:
- **US1**: Create list → verify both shareId and viewId generated and distinct
- **US2**: Access /list/[viewId] → verify read-only UI (no edit controls shown)
- **US3**: curl POST with viewId → verify 403 Forbidden response

**Suggested MVP**: User Story 1 only (Tasks T001-T016) - generates and displays view-only links

**Estimated LOC**: ~300 lines total
- Foundational: ~30 LOC
- US1: ~50 LOC
- US2: ~100 LOC
- US3: ~80 LOC
- Polish: ~40 LOC

**Format Validation**: ✅ All tasks follow checklist format with IDs, [P] markers where applicable, [Story] labels for user story phases, and file paths in descriptions
