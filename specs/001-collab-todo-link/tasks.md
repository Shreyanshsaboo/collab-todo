# Task List: Collaborative To-Do Application

**Feature**: 001-collab-todo-link  
**Branch**: `001-collab-todo-link`  
**Created**: 2026-01-05

## Overview

This task list is organized by user story to enable independent implementation and testing of each feature slice. Each user story represents a complete, shippable increment of functionality.

**User Stories**:
- **P1 - Create and Share List**: Foundation - create lists and generate shareable links
- **P2 - Manage Tasks**: Core CRUD operations on tasks (add, complete, delete)
- **P3 - Collaborative Viewing**: Multi-user synchronization via polling

**Implementation Strategy**: MVP first (User Story 1), then incremental delivery (User Stories 2, 3)

---

## Phase 1: Setup (Project Initialization)

**Goal**: Set up development environment and verify existing infrastructure

- [ ] T001 Verify Next.js 16+ and TypeScript 5.x are properly configured in package.json
- [ ] T002 Verify TailwindCSS 4 is configured and working with a test component
- [ ] T003 [P] Install MongoDB driver: npm install mongodb
- [ ] T004 Create .env.local file with MONGODB_URI and MONGODB_DATABASE variables
- [ ] T005 Start MongoDB locally or set up MongoDB Atlas cluster
- [ ] T006 Verify MongoDB connection by running mongosh with connection string
- [ ] T007 Create database indexes using mongosh (TodoList.shareId unique, TodoItem.listId, compound index)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Goal**: Build shared infrastructure needed by all user stories

### Database Layer

- [ ] T008 Create lib/db-types.ts with TypeScript interfaces (TodoListDocument, TodoItemDocument)
- [ ] T009 Create lib/mongodb.ts with connection pooling and caching for serverless
- [ ] T010 [P] Create lib/utils.ts with generateShareId() function (9-char alphanumeric)
- [ ] T011 Test database connection by creating a test script that connects and queries

### Type Definitions

- [ ] T012 [P] Add API response types to lib/db-types.ts (TodoList, TodoItem with serialized ObjectIds)
- [ ] T013 [P] Add request body types to lib/db-types.ts (CreateListRequest, CreateItemRequest, etc.)

---

## Phase 3: User Story 1 - Create and Share List (P1)

**Story Goal**: Users can create a new to-do list and receive a shareable link

**Independent Test**: Create list via UI → Verify in database → Confirm unique URL displayed → Open URL in incognito → View list

### API Endpoints

- [ ] T014 [US1] Implement POST /api/lists/route.ts to create new list with generated shareId
- [ ] T015 [US1] Add shareId uniqueness check and regeneration logic in POST /api/lists/route.ts
- [ ] T016 [US1] Add validation for list title (non-empty, max 200 chars) in POST /api/lists/route.ts
- [ ] T017 [US1] Implement GET /api/lists/[shareId]/route.ts to fetch list by shareId
- [ ] T018 [US1] Return 404 with error message when shareId not found in GET /api/lists/[shareId]/route.ts
- [ ] T019 [P] [US1] Implement PATCH /api/lists/[shareId]/route.ts to update list title (optional for MVP)

### UI Components

- [ ] T020 [P] [US1] Create components/ShareLink.tsx to display URL and copy-to-clipboard button
- [ ] T021 [US1] Add visual feedback (toast or text change) on successful copy in components/ShareLink.tsx
- [ ] T022 [US1] Create app/page.tsx with form to create new list (title input + submit button)
- [ ] T023 [US1] Add form validation in app/page.tsx (require title or use "Untitled List")
- [ ] T024 [US1] Implement POST request to /api/lists in app/page.tsx on form submit
- [ ] T025 [US1] Add redirect to /[shareId] after successful list creation in app/page.tsx
- [ ] T026 [US1] Add loading state during list creation in app/page.tsx
- [ ] T027 [US1] Add error handling and display for failed list creation in app/page.tsx

### List View Page

- [ ] T028 [US1] Create app/[shareId]/page.tsx with dynamic routing to capture shareId param
- [ ] T029 [US1] Implement GET request to /api/lists/[shareId] on page load in app/[shareId]/page.tsx
- [ ] T030 [US1] Display list title prominently in app/[shareId]/page.tsx
- [ ] T031 [US1] Render ShareLink component with current URL in app/[shareId]/page.tsx
- [ ] T032 [US1] Add loading state while fetching list data in app/[shareId]/page.tsx
- [ ] T033 [US1] Handle 404 error with user-friendly message and "Create New List" link in app/[shareId]/page.tsx
- [ ] T034 [US1] Add error handling for network failures in app/[shareId]/page.tsx

### Integration & Testing

- [ ] T035 [US1] Test complete flow: create list → verify redirect → check URL → open in incognito
- [ ] T036 [US1] Test edge case: invalid shareId displays 404 page
- [ ] T037 [US1] Test edge case: empty title uses default or shows validation error
- [ ] T038 [US1] Verify list created in MongoDB with correct shareId and timestamps

---

## Phase 4: User Story 2 - Manage Tasks (P2)

**Story Goal**: Users can add, complete, and delete tasks on a shared list

**Independent Test**: Access existing list → Add task → Verify persisted → Toggle completion → Verify state → Delete task → Verify removed

### API Endpoints

- [ ] T039 [US2] Implement POST /api/lists/[shareId]/items/route.ts to create new item
- [ ] T040 [US2] Calculate next order value (max + 100 or 0) in POST /api/lists/[shareId]/items/route.ts
- [ ] T041 [US2] Add validation for item text (non-empty, max 500 chars) in POST /api/lists/[shareId]/items/route.ts
- [ ] T042 [US2] Return 404 if list not found when creating item in POST /api/lists/[shareId]/items/route.ts
- [ ] T043 [US2] Implement PATCH /api/lists/[shareId]/items/[itemId]/route.ts to update item
- [ ] T044 [US2] Support updating text, completed, and order fields in PATCH /api/lists/[shareId]/items/[itemId]/route.ts
- [ ] T045 [US2] Add validation for PATCH request body in /api/lists/[shareId]/items/[itemId]/route.ts
- [ ] T046 [US2] Return 404 if item not found in PATCH /api/lists/[shareId]/items/[itemId]/route.ts
- [ ] T047 [US2] Implement DELETE /api/lists/[shareId]/items/[itemId]/route.ts to remove item
- [ ] T048 [US2] Return 204 on successful deletion in DELETE /api/lists/[shareId]/items/[itemId]/route.ts
- [ ] T049 [US2] Return 404 if item not found in DELETE /api/lists/[shareId]/items/[itemId]/route.ts

### UI Components

- [ ] T050 [P] [US2] Create components/TodoItem.tsx with checkbox, text display, and delete button
- [ ] T051 [US2] Add visual indication of completed state (strikethrough, color change) in components/TodoItem.tsx
- [ ] T052 [US2] Implement onToggle callback to handle checkbox clicks in components/TodoItem.tsx
- [ ] T053 [US2] Implement onDelete callback to handle delete button clicks in components/TodoItem.tsx
- [ ] T054 [P] [US2] Create components/AddTodoForm.tsx with input field and submit button
- [ ] T055 [US2] Add form validation (non-empty text) in components/AddTodoForm.tsx
- [ ] T056 [US2] Clear input field after successful submission in components/AddTodoForm.tsx
- [ ] T057 [US2] Support Enter key to submit form in components/AddTodoForm.tsx
- [ ] T058 [US2] Implement onAdd callback to handle new item submission in components/AddTodoForm.tsx

### List Component Integration

- [ ] T059 [US2] Create components/TodoList.tsx to contain all items and add form
- [ ] T060 [US2] Render list of TodoItem components in components/TodoList.tsx
- [ ] T061 [US2] Render AddTodoForm component at top or bottom of list in components/TodoList.tsx
- [ ] T062 [US2] Implement optimistic update for adding items in components/TodoList.tsx
- [ ] T063 [US2] Implement optimistic update for toggling completion in components/TodoList.tsx
- [ ] T064 [US2] Implement optimistic update for deleting items in components/TodoList.tsx
- [ ] T065 [US2] Add rollback logic on API error for all optimistic updates in components/TodoList.tsx
- [ ] T066 [US2] Display error messages when API calls fail in components/TodoList.tsx

### Page Integration

- [ ] T067 [US2] Update app/[shareId]/page.tsx to fetch items along with list
- [ ] T068 [US2] Pass items data to TodoList component in app/[shareId]/page.tsx
- [ ] T069 [US2] Implement handleAddItem to POST new items in app/[shareId]/page.tsx
- [ ] T070 [US2] Implement handleToggleItem to PATCH item completion in app/[shareId]/page.tsx
- [ ] T071 [US2] Implement handleDeleteItem to DELETE items in app/[shareId]/page.tsx
- [ ] T072 [US2] Update local state after successful API calls in app/[shareId]/page.tsx

### Integration & Testing

- [ ] T073 [US2] Test add task flow: enter text → submit → verify appears → refresh → still present
- [ ] T074 [US2] Test complete task flow: click checkbox → verify strikethrough → refresh → still completed
- [ ] T075 [US2] Test delete task flow: click delete → verify removed → refresh → still gone
- [ ] T076 [US2] Test edge case: add empty task shows validation error
- [ ] T077 [US2] Test edge case: add 500+ char task is truncated or rejected
- [ ] T078 [US2] Test multiple rapid additions to verify all tasks persisted
- [ ] T079 [US2] Verify items stored in MongoDB with correct listId and order values

---

## Phase 5: User Story 3 - Collaborative Viewing (P3)

**Story Goal**: Multiple users see synchronized updates across windows

**Independent Test**: Open same URL in two windows → Make changes in window A → Wait 5-10s → Verify changes appear in window B

### Polling Implementation

- [ ] T080 [US3] Implement setInterval polling in app/[shareId]/page.tsx (5-second interval)
- [ ] T081 [US3] Fetch latest data from GET /api/lists/[shareId] in polling function
- [ ] T082 [US3] Compare timestamps to detect changes before updating UI state
- [ ] T083 [US3] Update list and items state only if data has changed in app/[shareId]/page.tsx
- [ ] T084 [US3] Clear polling interval on component unmount in app/[shareId]/page.tsx
- [ ] T085 [US3] Handle polling errors gracefully (log to console, continue polling)
- [ ] T086 [US3] Add exponential backoff for repeated polling failures in app/[shareId]/page.tsx

### UI Feedback

- [ ] T087 [P] [US3] Add subtle indicator showing last sync time (optional enhancement)
- [ ] T088 [P] [US3] Add connection status indicator when offline (optional enhancement)

### Integration & Testing

- [ ] T089 [US3] Test two-window sync: add task in window A → appears in window B within 10s
- [ ] T090 [US3] Test two-window sync: complete task in window A → marked completed in window B
- [ ] T091 [US3] Test two-window sync: delete task in window A → removed in window B
- [ ] T092 [US3] Test rapid concurrent additions from multiple windows
- [ ] T093 [US3] Test offline scenario: disconnect → make changes → reconnect → see server state
- [ ] T094 [US3] Verify polling doesn't cause excessive re-renders (check React DevTools)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Improve UX, handle edge cases, and ensure production readiness

### Styling & UX

- [ ] T095 [P] Style landing page (app/page.tsx) with TailwindCSS
- [ ] T096 [P] Style list view page (app/[shareId]/page.tsx) with TailwindCSS
- [ ] T097 [P] Style TodoItem component with proper spacing and hover effects
- [ ] T098 [P] Style AddTodoForm component with clean input and button design
- [ ] T099 [P] Style ShareLink component with copy button and URL display
- [ ] T100 [P] Add loading spinners for async operations
- [ ] T101 [P] Add skeleton loaders for initial page load
- [ ] T102 [P] Ensure responsive design works on mobile devices
- [ ] T103 [P] Add focus states for accessibility (keyboard navigation)

### Error Handling

- [ ] T104 [P] Add error boundary component for React errors
- [ ] T105 [P] Display user-friendly error messages for all API failures
- [ ] T106 [P] Add retry buttons for failed operations
- [ ] T107 [P] Log errors to console for debugging (production: use error tracking service)

### Performance

- [ ] T108 [P] Optimize polling to only refetch if updatedAt changed (conditional requests)
- [ ] T109 [P] Use React.memo for TodoItem if list becomes large
- [ ] T110 [P] Debounce rapid user actions (optional for v1)

### Documentation

- [ ] T111 [P] Update README.md with setup instructions (reference quickstart.md)
- [ ] T112 [P] Add inline code comments for complex logic (shareId generation, polling)
- [ ] T113 [P] Document environment variables in .env.example file

---

## Dependencies

### Story Completion Order

```
Phase 1 (Setup) 
    ↓
Phase 2 (Foundational)
    ↓
User Story 1 (P1: Create and Share List)
    ↓
User Story 2 (P2: Manage Tasks)
    ↓
User Story 3 (P3: Collaborative Viewing)
    ↓
Phase 6 (Polish)
```

**Critical Path**:
1. Setup environment (T001-T007)
2. Database layer (T008-T011)
3. Create list API + UI (T014-T034)
4. Task CRUD APIs (T039-T049)
5. Task management UI (T050-T072)
6. Polling implementation (T080-T086)

### Independent Work Streams

Tasks marked with `[P]` can be worked on in parallel with other tasks at the same phase level:

**Phase 2 Parallel Work**:
- T010 (utils.ts) || T008 (db-types.ts) || T009 (mongodb.ts)
- T012 (API types) || T013 (request types)

**Phase 3 Parallel Work**:
- T019 (PATCH list) can be done later
- T020-T021 (ShareLink) can be built independently

**Phase 4 Parallel Work**:
- T050-T053 (TodoItem) || T054-T058 (AddTodoForm)
- T095-T103 (styling tasks) can all be done in parallel

**Phase 5 Parallel Work**:
- T087-T088 (UI indicators) are optional enhancements

**Phase 6 Parallel Work**:
- All styling tasks (T095-T103)
- All error handling tasks (T104-T107)
- All performance tasks (T108-T110)
- All documentation tasks (T111-T113)

---

## Parallel Execution Examples

### User Story 1 Parallelization
After T014-T019 (APIs) complete:
- **Stream A**: T020-T021 (ShareLink component)
- **Stream B**: T022-T027 (Landing page)
- **Stream C**: T028-T034 (List view page)

Then converge for integration testing (T035-T038)

### User Story 2 Parallelization
After T039-T049 (APIs) complete:
- **Stream A**: T050-T053 (TodoItem component)
- **Stream B**: T054-T058 (AddTodoForm component)

Then combine in T059-T066 (TodoList container), followed by T067-T072 (page integration)

### User Story 3 Parallelization
After T080-T086 (polling) complete:
- **Stream A**: T087-T088 (optional UI enhancements)
- **Stream B**: T089-T094 (testing)

---

## Implementation Strategy

### MVP Scope (Week 1)
Focus on **User Story 1 only**:
- T001-T013 (Setup + Foundational)
- T014-T038 (Create and Share List)

**Deliverable**: Users can create lists and share URLs

### Iteration 2 (Week 2)
Add **User Story 2**:
- T039-T079 (Manage Tasks)

**Deliverable**: Users can add, complete, and delete tasks

### Iteration 3 (Week 3)
Add **User Story 3**:
- T080-T094 (Collaborative Viewing)

**Deliverable**: Multi-user synchronization works

### Polish (Week 4)
Phase 6 tasks:
- T095-T113 (Styling, errors, performance, docs)

**Deliverable**: Production-ready application

---

## Task Summary

- **Total Tasks**: 113
- **Setup Phase**: 7 tasks
- **Foundational Phase**: 6 tasks
- **User Story 1 (P1)**: 25 tasks
- **User Story 2 (P2)**: 41 tasks
- **User Story 3 (P3)**: 15 tasks
- **Polish Phase**: 19 tasks

**Parallelizable Tasks**: 39 tasks (marked with `[P]`)

**Estimated Effort**:
- MVP (US1): 2-3 days
- US2: 3-4 days
- US3: 1-2 days
- Polish: 2-3 days
- **Total**: 8-12 days for solo developer

---

## Success Criteria Validation

### User Story 1 Completion Checklist
- [ ] Can create new list via UI
- [ ] List has unique shareId in database
- [ ] ShareId appears in URL after creation
- [ ] Share link is displayed with copy button
- [ ] Opening share link in incognito shows same list
- [ ] Invalid shareId shows 404 page

### User Story 2 Completion Checklist
- [ ] Can add task and it appears in list
- [ ] Can toggle task completion with checkbox
- [ ] Completed tasks show visual indication
- [ ] Can delete tasks
- [ ] All operations persist across page refresh
- [ ] Validation prevents empty tasks

### User Story 3 Completion Checklist
- [ ] Changes made in window A appear in window B within 10 seconds
- [ ] Add/complete/delete operations all sync between windows
- [ ] Polling runs every 5 seconds
- [ ] No excessive re-renders or performance issues
- [ ] Offline then online shows correct server state

### Overall Completion Criteria
- [ ] All 15 functional requirements satisfied
- [ ] All 7 success criteria met
- [ ] No console errors in production build
- [ ] Application follows all constitutional principles
- [ ] Code is properly typed with TypeScript
- [ ] Application deployed and accessible via URL

---

## Notes

- **Tests**: Manual testing only for MVP. Automated tests (Jest, Playwright) are future enhancements.
- **TDD Not Required**: Per constitution, TDD is not mandatory for this feature.
- **Story Independence**: Each user story can be fully tested independently by running the checklist above.
- **Incremental Delivery**: Ship User Story 1 as MVP, then add User Story 2, then User Story 3.
- **File Paths**: All task descriptions include specific file paths for implementation.
- **Format Compliance**: All tasks follow the required checklist format with Task ID, optional [P] marker, Story label, and description with file path.
