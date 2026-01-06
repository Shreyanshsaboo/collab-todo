# Implementation Checklist

## Prerequisites
- [ ] MongoDB instance running (local or cloud)
- [ ] Environment variables configured in `.env.local`

---

## Phase 1: Database Setup

### MongoDB Connection
- [ ] Install MongoDB driver: `npm install mongodb`
- [ ] Create `lib/mongodb.ts` with connection utility
- [ ] Create `lib/db-types.ts` with TypeScript interfaces
- [ ] Test connection to MongoDB

### Database Initialization
- [ ] Create `scripts/init-db.ts` to set up collections
- [ ] Create indexes:
  - Unique index on `TodoList.shareId`
  - Index on `TodoItem.listId`
  - Compound index on `TodoItem.listId + order`

---

## Phase 2: API Routes

### List Management APIs
- [ ] `POST /api/lists/route.ts`
  - Generate unique shareId
  - Validate title
  - Create list document
  - Return list with shareId

- [ ] `GET /api/lists/[shareId]/route.ts`
  - Fetch list by shareId
  - Fetch all items for list (sorted by order)
  - Return combined response

- [ ] `PATCH /api/lists/[shareId]/route.ts`
  - Validate shareId exists
  - Update list title
  - Update updatedAt timestamp

### Item Management APIs
- [ ] `POST /api/lists/[shareId]/items/route.ts`
  - Validate list exists
  - Calculate next order value
  - Create item document
  - Return new item

- [ ] `PATCH /api/lists/[shareId]/items/[itemId]/route.ts`
  - Validate item exists
  - Update text/completed/order
  - Update updatedAt timestamp
  - Return updated item

- [ ] `DELETE /api/lists/[shareId]/items/[itemId]/route.ts`
  - Validate item exists
  - Delete item document
  - Return 204 status

---

## Phase 3: UI Components

### Core Components
- [ ] `components/TodoItem.tsx`
  - Checkbox for completion toggle
  - Text display (inline edit optional for v1)
  - Delete button
  - Props: item data, onToggle, onDelete callbacks

- [ ] `components/AddTodoForm.tsx`
  - Input field for new item text
  - Submit button
  - Form validation
  - Props: onAdd callback

- [ ] `components/TodoList.tsx`
  - List header with title
  - Render all TodoItem components
  - Render AddTodoForm
  - Handle optimistic updates
  - Props: list data, items data

- [ ] `components/ShareLink.tsx`
  - Display current URL
  - Copy to clipboard button
  - Visual feedback on copy
  - Props: shareId

---

## Phase 4: Pages

### Landing Page
- [ ] `app/page.tsx`
  - Simple form to create new list
  - "Create List" button
  - Redirect to new list on creation
  - Display loading state

### List View Page
- [ ] `app/[shareId]/page.tsx`
  - Fetch list and items on load
  - Render TodoList component
  - Render ShareLink component
  - Implement polling for updates (every 5s)
  - Handle 404 if shareId invalid
  - Loading and error states

---

## Phase 5: Styling

### Global Styles
- [ ] Update `app/globals.css` with base styles
- [ ] Configure Tailwind for component styling
- [ ] Ensure dark mode support (optional)

### Component Styles
- [ ] Style TodoItem (checkbox, text, delete button)
- [ ] Style AddTodoForm (input, submit button)
- [ ] Style TodoList (container, header)
- [ ] Style ShareLink (URL display, copy button)
- [ ] Responsive design for mobile/desktop

---

## Phase 6: Testing & Validation

### Manual Testing
- [ ] Create a new list
- [ ] Add multiple items
- [ ] Toggle item completion
- [ ] Delete items
- [ ] Copy share link
- [ ] Open share link in new browser/incognito
- [ ] Verify collaborative editing (two tabs)
- [ ] Test edge cases (empty list, long text, special characters)

### Error Scenarios
- [ ] Test invalid shareId (404 handling)
- [ ] Test network errors (retry/error messages)
- [ ] Test database connection failures

---

## Phase 7: Deployment Preparation

### Environment
- [ ] Document environment variables in README
- [ ] Create `.env.example` file
- [ ] Add MongoDB connection instructions

### Build & Deploy
- [ ] Test production build: `npm run build`
- [ ] Verify all API routes work in production mode
- [ ] Deploy to hosting platform (Vercel, etc.)
- [ ] Test deployed application

---

## Optional Enhancements (Post-MVP)

### UX Improvements
- [ ] Inline editing of item text
- [ ] Drag-and-drop reordering
- [ ] Keyboard shortcuts
- [ ] Toast notifications for actions
- [ ] Undo/redo functionality

### Features
- [ ] List templates
- [ ] Bulk operations (delete all completed)
- [ ] Export list (JSON, Markdown)
- [ ] Archive completed items

### Performance
- [ ] Implement debouncing for API calls
- [ ] Add request caching
- [ ] Optimize database queries
- [ ] Implement pagination for large lists

---

## Definition of Done

A task is considered complete when:
1. Code is written and follows TypeScript conventions
2. Component is tested manually in browser
3. Error handling is implemented
4. Code is committed to version control
5. No console errors or warnings

---

## Success Criteria

The MVP is complete when:
1. Users can create a new list via landing page
2. Users can add, complete, and delete items
3. Users can share lists via URL
4. Multiple users can view and edit the same list
5. Changes sync across clients (via polling)
6. Application is deployed and accessible
