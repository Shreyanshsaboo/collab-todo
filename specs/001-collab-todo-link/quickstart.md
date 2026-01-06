# Quickstart Guide: Collaborative To-Do Application

**Feature**: 001-collab-todo-link  
**Date**: 2026-01-05

## Overview

This guide will help you set up, develop, and test the collaborative to-do application. The application allows users to create shareable task lists accessible via unique links without authentication.

---

## Prerequisites

### Required Software
- **Node.js**: Version 18.x or higher ([Download](https://nodejs.org/))
- **npm**: Version 8.x or higher (comes with Node.js)
- **MongoDB**: Version 5.x or higher
  - Local: [MongoDB Community Edition](https://www.mongodb.com/try/download/community)
  - Cloud: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier available)
- **Git**: For version control

### Recommended Tools
- **VS Code**: Code editor with TypeScript support
- **MongoDB Compass**: GUI for MongoDB (optional, for database inspection)
- **Postman**: API testing (optional, for manual API testing)

---

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Navigate to project directory
cd /Users/shreyanshsaboo/collab-todo

# Ensure you're on the feature branch
git checkout 001-collab-todo-link

# Install dependencies
npm install

# Install MongoDB driver
npm install mongodb
```

### 2. Set Up MongoDB

**Option A: Local MongoDB**

```bash
# Start MongoDB service
# macOS (Homebrew):
brew services start mongodb-community

# Linux (systemd):
sudo systemctl start mongod

# Windows:
# Start MongoDB from Services or run: net start MongoDB

# Verify MongoDB is running
mongosh
# You should see MongoDB shell prompt
```

**Option B: MongoDB Atlas (Cloud)**

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Get connection string (e.g., `mongodb+srv://user:pass@cluster.mongodb.net/`)

### 3. Configure Environment Variables

Create `.env.local` file in project root:

```bash
# .env.local
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=collab-todo

# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
# MONGODB_DATABASE=collab-todo
```

**Important**: Add `.env.local` to `.gitignore` (should already be there)

### 4. Initialize Database

Create indexes for optimal performance:

```bash
# Connect to MongoDB shell
mongosh mongodb://localhost:27017/collab-todo

# Run these commands in MongoDB shell:
use collab-todo

db.createCollection("TodoList")
db.createCollection("TodoItem")

db.TodoList.createIndex({ shareId: 1 }, { unique: true })
db.TodoItem.createIndex({ listId: 1 })
db.TodoItem.createIndex({ listId: 1, order: 1 })

exit
```

---

## Development Workflow

### Start Development Server

```bash
# Start Next.js development server
npm run dev

# Server will start at http://localhost:3000
# Open in browser to test
```

### Project Structure Quick Reference

```
app/
├── page.tsx                    # Landing page (create list)
├── [shareId]/page.tsx          # Shared list page
├── layout.tsx                  # Root layout
└── api/
    └── lists/
        ├── route.ts                        # POST /api/lists
        └── [shareId]/
            ├── route.ts                    # GET, PATCH /api/lists/[shareId]
            └── items/
                ├── route.ts                # POST items
                └── [itemId]/route.ts       # PATCH, DELETE items

components/
├── TodoList.tsx                # Main list component
├── TodoItem.tsx                # Individual item component
├── AddTodoForm.tsx             # Add item form
└── ShareLink.tsx               # Share link display

lib/
├── mongodb.ts                  # Database connection
├── db-types.ts                 # TypeScript interfaces
└── utils.ts                    # Utilities (shareId generation)
```

### Implementation Order

Follow this sequence for building the feature:

**Phase 1: Database Layer** (Start here)
1. Create `lib/mongodb.ts` - MongoDB connection utility
2. Create `lib/db-types.ts` - TypeScript interfaces
3. Create `lib/utils.ts` - ShareId generation function
4. Test connection by running `node` and importing the connection

**Phase 2: API Routes**
1. `POST /api/lists/route.ts` - Create list endpoint
2. `GET /api/lists/[shareId]/route.ts` - Get list + items endpoint
3. `POST /api/lists/[shareId]/items/route.ts` - Create item endpoint
4. `PATCH /api/lists/[shareId]/items/[itemId]/route.ts` - Update item endpoint
5. `DELETE /api/lists/[shareId]/items/[itemId]/route.ts` - Delete item endpoint
6. Test each endpoint with curl or Postman

**Phase 3: UI Components**
1. `components/TodoItem.tsx` - Item display with checkbox and delete
2. `components/AddTodoForm.tsx` - Form to add new items
3. `components/ShareLink.tsx` - Display share link with copy button
4. `components/TodoList.tsx` - Main list container with polling

**Phase 4: Pages**
1. `app/page.tsx` - Landing page to create new list
2. `app/[shareId]/page.tsx` - Shared list view/edit page

**Phase 5: Testing & Polish**
1. Test create → share → collaborate workflow
2. Test edge cases (invalid IDs, empty inputs, etc.)
3. Add error handling and loading states
4. Style with TailwindCSS

---

## Testing

### Manual Testing Checklist

**Create List Flow**:
- [ ] Navigate to http://localhost:3000
- [ ] Enter list title and click "Create List"
- [ ] Verify redirect to /[shareId]
- [ ] Verify list title displays correctly
- [ ] Verify share link is shown

**Add Task Flow**:
- [ ] Enter task text in input field
- [ ] Press Enter or click "Add"
- [ ] Verify task appears in list
- [ ] Verify task persists on page refresh

**Complete Task Flow**:
- [ ] Click checkbox next to task
- [ ] Verify task shows completed state (strikethrough)
- [ ] Click checkbox again to mark incomplete
- [ ] Verify state persists on refresh

**Delete Task Flow**:
- [ ] Click delete button on task
- [ ] Verify task is removed from list
- [ ] Verify deletion persists on refresh

**Collaboration Flow**:
- [ ] Copy share link from one browser window
- [ ] Open link in incognito/private window (or different browser)
- [ ] Add task in first window
- [ ] Wait 5-10 seconds
- [ ] Verify task appears in second window
- [ ] Complete task in second window
- [ ] Verify completion shows in first window after polling

**Edge Cases**:
- [ ] Try accessing invalid shareId (e.g., /xyz) → Should show 404
- [ ] Try adding empty task → Should show validation error
- [ ] Try adding 500+ character task → Should be truncated or rejected
- [ ] Try creating list with empty title → Should use default or show error

### API Testing with curl

**Create List**:
```bash
curl -X POST http://localhost:3000/api/lists \
  -H "Content-Type: application/json" \
  -d '{"title":"Test List"}'
```

**Get List** (replace `abc123xyz` with actual shareId):
```bash
curl http://localhost:3000/api/lists/abc123xyz
```

**Add Item**:
```bash
curl -X POST http://localhost:3000/api/lists/abc123xyz/items \
  -H "Content-Type: application/json" \
  -d '{"text":"Test task"}'
```

**Toggle Completion** (replace itemId):
```bash
curl -X PATCH http://localhost:3000/api/lists/abc123xyz/items/507f1f77bcf86cd799439012 \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'
```

**Delete Item**:
```bash
curl -X DELETE http://localhost:3000/api/lists/abc123xyz/items/507f1f77bcf86cd799439012
```

---

## Troubleshooting

### Common Issues

**"Cannot connect to MongoDB"**
- Verify MongoDB is running: `mongosh` or check service status
- Check connection string in `.env.local`
- Verify network access (for Atlas, check IP whitelist)

**"Module not found: mongodb"**
- Run `npm install mongodb`
- Restart development server

**"ShareId collision detected"**
- This is expected behavior, shareId will be regenerated
- If it happens frequently, check shareId generation logic

**"Tasks not syncing between windows"**
- Check browser console for errors
- Verify polling is running (check Network tab for GET requests every 5s)
- Check server logs for API errors

**"TypeScript errors"**
- Run `npm run build` to check for type errors
- Ensure `lib/db-types.ts` is properly exported
- Check `tsconfig.json` includes all source directories

### Debug Mode

Enable verbose logging:

```typescript
// In lib/mongodb.ts
console.log('MongoDB URI:', process.env.MONGODB_URI);
console.log('Connecting to database...');

// In API routes
console.log('Request body:', await request.json());
console.log('Query result:', result);
```

View logs in terminal running `npm run dev`

---

## Environment-Specific Setup

### Local Development
```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=collab-todo
```

### Staging/Production (Vercel)
```bash
# Add environment variables in Vercel dashboard
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DATABASE=collab-todo-prod
```

---

## Next Steps

After completing the quickstart:

1. **Review Documentation**:
   - [spec.md](spec.md) - Feature specification
   - [data-model.md](data-model.md) - Database schema details
   - [contracts/api.openapi.yaml](contracts/api.openapi.yaml) - API specification

2. **Implement Features**: Follow implementation order above

3. **Test Thoroughly**: Use manual testing checklist

4. **Deploy**: Push to Vercel or preferred hosting platform

5. **Future Enhancements** (post-MVP):
   - Add automated tests (Jest, Playwright)
   - Implement drag-and-drop reordering
   - Add inline editing for task text
   - Improve error messages and loading states
   - Add toast notifications
   - Optimize polling (conditional requests with ETags)

---

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
mongosh                  # Open MongoDB shell
mongosh --eval "db.stats()" # Quick DB stats

# Git
git status               # Check current changes
git add .                # Stage all changes
git commit -m "message"  # Commit changes
git push origin 001-collab-todo-link # Push to remote

# TypeScript
npx tsc --noEmit         # Check types without building
```

---

## Getting Help

- **Specification Issues**: Review [spec.md](spec.md)
- **API Questions**: Check [contracts/api.openapi.yaml](contracts/api.openapi.yaml)
- **Database Questions**: Review [data-model.md](data-model.md)
- **Next.js Docs**: https://nextjs.org/docs
- **MongoDB Docs**: https://www.mongodb.com/docs/
- **TypeScript Docs**: https://www.typescriptlang.org/docs/

---

## Success Criteria

You've successfully set up the project when:

✅ Development server runs without errors  
✅ MongoDB connection is established  
✅ You can create a list and see it in the database  
✅ You can add tasks via API (test with curl)  
✅ You can view the list in the browser  
✅ Changes sync between multiple browser windows  

Happy coding! 🚀
