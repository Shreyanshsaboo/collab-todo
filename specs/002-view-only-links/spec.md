# Feature Specification: View-Only Access Links

**Feature Branch**: `002-view-only-links`  
**Created**: 2026-01-06  
**Status**: Draft  
**Input**: User description: "Collaborative To-Do Application with view-only and edit permission links"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate View-Only Links (Priority: P1)

As a list owner, I want to generate a view-only link for my todo list so that I can share read-only access with people who should not be able to edit tasks.

**Why this priority**: This is the core functionality that enables the permission model. Without the ability to generate view-only links, all shared lists remain editable by everyone, which is the current limitation.

**Independent Test**: Can be fully tested by creating a list, generating the view-only link, and verifying that the link allows viewing but prevents editing. Delivers immediate value by enabling read-only sharing.

**Acceptance Scenarios**:

1. **Given** a user has created a todo list, **When** they request a view-only link, **Then** the system generates a unique viewId and displays the view-only URL
2. **Given** a list with existing tasks, **When** a view-only link is generated, **Then** the viewId is distinct from the shareId (edit link)
3. **Given** a user is on the list page with edit access, **When** they view the share section, **Then** both edit and view-only links are displayed with clear labels

---

### User Story 2 - Access List with View-Only Permission (Priority: P2)

As a collaborator with a view-only link, I want to view tasks in a todo list so that I can see progress without accidentally modifying anything.

**Why this priority**: This validates that view-only links work correctly for the read path. It's the second priority because generating the links is useless without a way to use them.

**Independent Test**: Access a list using a viewId, verify all tasks are visible, and confirm that no edit UI elements are shown. Demonstrates the read-only user experience.

**Acceptance Scenarios**:

1. **Given** a valid viewId in the URL, **When** a user accesses `/list/[viewId]`, **Then** the list and all items are displayed
2. **Given** a user viewing with view-only permission, **When** the page loads, **Then** add item form, edit buttons, delete buttons, and title edit are hidden
3. **Given** a user with view-only access, **When** other users add/edit/delete tasks, **Then** changes appear automatically via polling (5-second intervals)
4. **Given** an invalid or non-existent viewId, **When** a user tries to access the list, **Then** a 404 Not Found page is displayed

---

### User Story 3 - Enforce Edit Permission Restrictions (Priority: P3)

As a system administrator, I want write operations to be blocked for view-only users so that unauthorized modifications are prevented at the API level.

**Why this priority**: This is critical for security but comes after the user-facing features because it's a backend enforcement that users don't directly interact with. It validates the permission model integrity.

**Independent Test**: Attempt API write operations (POST, PATCH, DELETE) using a viewId in the URL path and verify all return 403 Forbidden. Ensures server-side enforcement works correctly.

**Acceptance Scenarios**:

1. **Given** a user with a viewId, **When** they attempt to create a new item via API, **Then** the system returns 403 Forbidden with error message
2. **Given** a user with a viewId, **When** they attempt to update the list title via API, **Then** the system returns 403 Forbidden
3. **Given** a user with a viewId, **When** they attempt to update or delete an item via API, **Then** the system returns 403 Forbidden
4. **Given** a user with a shareId (edit permission), **When** they perform write operations, **Then** all operations succeed as before (no regression)

---

### Edge Cases

- What happens when a viewId is used where a shareId is expected (e.g., in the edit link URL)?
  - System should detect this is a view-only identifier and redirect to the view-only path or show view-only UI
  
- How does the system handle a list that exists but has no viewId generated yet?
  - Backward compatibility: Existing lists created before this feature should automatically generate a viewId on first access or when the view-only link is requested
  
- What happens if viewId and shareId collide (same random string generated)?
  - Generate a new viewId and retry (same collision handling as shareId generation)
  
- How does the UI behave when a user switches from edit to view-only link?
  - The page should refresh and hide all edit controls; polling continues normally
  
- What happens when the database is unavailable during permission check?
  - API returns 500 Internal Server Error; user sees error message; no write operation is performed

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate a unique 9-character alphanumeric viewId for each todo list upon creation or first view-only link request
- **FR-002**: System MUST store viewId in the TodoList document with a unique index to prevent duplicates
- **FR-003**: System MUST display both edit link (shareId) and view-only link (viewId) on the list page when accessed with edit permission
- **FR-004**: System MUST hide all edit UI elements (add form, edit buttons, delete buttons, title editing) when list is accessed via viewId
- **FR-005**: System MUST validate permission on all write operations (POST, PATCH, DELETE) and return 403 Forbidden for viewId access
- **FR-006**: System MUST allow read operations (GET) for both shareId and viewId
- **FR-007**: System MUST distinguish between shareId and viewId at the API route level to determine permission
- **FR-008**: System MUST generate viewIds with the same cryptographic randomness as shareIds (using crypto.randomBytes)
- **FR-009**: System MUST handle backward compatibility by generating viewId for existing lists created before this feature
- **FR-010**: System MUST update list metadata (updatedAt timestamp) only for write operations, not for permission checks

### Key Entities *(include if feature involves data)*

- **TodoList**: Extended with `viewId` field (string, optional for backward compatibility, unique index)
  - `_id`: ObjectId (primary key)
  - `shareId`: string (edit permission identifier, existing)
  - `viewId`: string | undefined (view-only permission identifier, new field)
  - `title`: string (list name)
  - `createdAt`: Date (creation timestamp)
  - `updatedAt`: Date (last modification timestamp)

- **Permission Context**: Derived from URL path parameter
  - If URL contains shareId: EDIT permission (read/write)
  - If URL contains viewId: VIEW permission (read-only)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate a view-only link for any todo list in under 5 seconds (1 click or tap)
- **SC-002**: Users accessing a list with a view-only link see all tasks and list title without any edit controls visible
- **SC-003**: 100% of unauthorized write attempts (using viewId) are blocked at the API level and return 403 Forbidden
- **SC-004**: View-only users receive automatic updates from other collaborators with the same 5-second polling interval as edit users
- **SC-005**: System generates non-colliding viewIds with same uniqueness guarantee as shareIds (collision rate < 0.0001%)
- **SC-006**: Existing lists created before this feature continue to function with edit access and can generate view-only links on demand

### User Experience Metrics

- **SC-007**: Users can distinguish between edit and view-only links through clear labeling (e.g., "Edit Link" vs "View-Only Link")
- **SC-008**: View-only users understand their permission level through UI cues (no edit controls, optional read-only badge)

## Assumptions

- Users creating lists have edit permission by default (via shareId)
- ViewId generation follows the same pattern as shareId (9-character lowercase alphanumeric)
- The permission model remains link-based; no user accounts or session-based permissions are introduced
- Polling interval (5 seconds) is sufficient for both edit and view-only users
- The system uses the URL path to determine permission (not cookies, headers, or query parameters)

## Out of Scope

- Permission revocation or expiration (links remain valid indefinitely)
- Permission levels beyond view and edit (no "comment-only" or "suggest" modes)
- Per-user activity tracking or audit logs
- Link regeneration or rotation
- User accounts or authentication
- Real-time WebSocket-based synchronization
