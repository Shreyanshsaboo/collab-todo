# Quickstart Guide: View-Only Access Links

**Feature**: View-Only Access Links  
**Estimated Setup Time**: 5 minutes  
**Prerequisites**: Node.js 22+, MongoDB 8+

## Overview

This guide helps developers quickly set up and test the view-only access links feature locally.

---

## 1. Environment Setup

### Install Dependencies

```bash
npm install
```

### Start MongoDB

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:8

# Or using local MongoDB
mongod --dbpath /path/to/data
```

### Configure Environment

```bash
# .env.local
MONGODB_URI=mongodb://localhost:27017/collab-todo
```

### Start Development Server

```bash
npm run dev
```

Application runs at [http://localhost:3000](http://localhost:3000)

---

## 2. Quick Test Scenarios

### Scenario A: Create List with Dual Access

**Goal**: Verify both shareId and viewId are generated

1. **Create a new list**:
   ```bash
   curl -X POST http://localhost:3000/api/lists \
     -H "Content-Type: application/json" \
     -d '{"title": "Test List"}'
   ```

2. **Expected Response**:
   ```json
   {
     "_id": "507f1f77bcf86cd799439011",
     "shareId": "abc123xyz",
     "viewId": "def456uvw",
     "title": "Test List",
     "createdAt": "2026-01-06T12:00:00.000Z",
     "updatedAt": "2026-01-06T12:00:00.000Z"
   }
   ```

3. **Verify**:
   - ✅ Both `shareId` and `viewId` present
   - ✅ Both are 9-character alphanumeric strings
   - ✅ `shareId !== viewId`

---

### Scenario B: Edit Permission (via shareId)

**Goal**: Verify full CRUD access with shareId

1. **Access list via shareId**:
   ```bash
   curl http://localhost:3000/api/lists/abc123xyz
   ```

2. **Expected Response**:
   ```json
   {
     "_id": "507f1f77bcf86cd799439011",
     "shareId": "abc123xyz",
     "viewId": "def456uvw",
     "title": "Test List",
     "permission": "edit",
     "createdAt": "2026-01-06T12:00:00.000Z",
     "updatedAt": "2026-01-06T12:00:00.000Z"
   }
   ```

3. **Create item (should succeed)**:
   ```bash
   curl -X POST http://localhost:3000/api/lists/abc123xyz/items \
     -H "Content-Type: application/json" \
     -d '{"text": "Test Item"}'
   ```

4. **Expected**: `201 Created` with item data

5. **Update list title (should succeed)**:
   ```bash
   curl -X PUT http://localhost:3000/api/lists/abc123xyz \
     -H "Content-Type: application/json" \
     -d '{"title": "Updated Title"}'
   ```

6. **Expected**: `200 OK` with updated list

---

### Scenario C: View Permission (via viewId)

**Goal**: Verify read-only access with viewId

1. **Access list via viewId**:
   ```bash
   curl http://localhost:3000/api/lists/def456uvw
   ```

2. **Expected Response**:
   ```json
   {
     "_id": "507f1f77bcf86cd799439011",
     "shareId": "abc123xyz",
     "viewId": "def456uvw",
     "title": "Test List",
     "permission": "view",
     "createdAt": "2026-01-06T12:00:00.000Z",
     "updatedAt": "2026-01-06T12:00:00.000Z"
   }
   ```

3. **Get items (should succeed)**:
   ```bash
   curl http://localhost:3000/api/lists/def456uvw/items
   ```

4. **Expected**: `200 OK` with items array

5. **Try to create item (should fail)**:
   ```bash
   curl -X POST http://localhost:3000/api/lists/def456uvw/items \
     -H "Content-Type: application/json" \
     -d '{"text": "Should Fail"}'
   ```

6. **Expected**: `403 Forbidden`
   ```json
   {
     "error": "Edit permission required"
   }
   ```

7. **Try to update list (should fail)**:
   ```bash
   curl -X PUT http://localhost:3000/api/lists/def456uvw \
     -H "Content-Type: application/json" \
     -d '{"title": "Should Fail"}'
   ```

8. **Expected**: `403 Forbidden`

---

### Scenario D: UI Conditional Rendering

**Goal**: Verify edit controls hidden for view-only users

1. **Access edit link in browser**:
   ```
   http://localhost:3000/list/abc123xyz
   ```

2. **Verify UI shows**:
   - ✅ "Add Item" input
   - ✅ Edit list title button
   - ✅ Delete item buttons
   - ✅ "Copy View-Only Link" button
   - ✅ "Copy Edit Link" button

3. **Access view-only link in browser**:
   ```
   http://localhost:3000/list/def456uvw
   ```

4. **Verify UI shows**:
   - ✅ List title (read-only)
   - ✅ Item list
   - ❌ No "Add Item" input
   - ❌ No edit title button
   - ❌ No delete buttons
   - ✅ "Copy View-Only Link" button (can share)
   - ✅ "Copy Edit Link" button (hidden - view users don't see shareId)

---

## 3. Testing Edge Cases

### Edge Case 1: Non-existent ID

```bash
curl http://localhost:3000/api/lists/invalid99
```

**Expected**: `404 Not Found`
```json
{
  "error": "List not found"
}
```

---

### Edge Case 2: Invalid ID Format

```bash
curl http://localhost:3000/api/lists/abc
```

**Expected**: `400 Bad Request`
```json
{
  "error": "Invalid shareId format"
}
```

---

### Edge Case 3: Backward Compatibility

**Test old list without viewId**:

1. **Manually insert old-format list**:
   ```javascript
   // In MongoDB shell or script
   db.lists.insertOne({
     shareId: "old123abc",
     title: "Old List",
     createdAt: new Date(),
     updatedAt: new Date()
     // Note: no viewId field
   });
   ```

2. **Access via shareId**:
   ```bash
   curl http://localhost:3000/api/lists/old123abc
   ```

3. **Expected**: Response includes generated viewId
   ```json
   {
     "shareId": "old123abc",
     "viewId": "gen789xyz",
     "title": "Old List",
     "permission": "edit"
   }
   ```

4. **Verify persistence**:
   ```bash
   curl http://localhost:3000/api/lists/old123abc
   ```

5. **Expected**: Same viewId returned (not regenerated)

---

## 4. Development Workflow

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### Checking TypeScript

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

---

## 5. Common Issues

### Issue: viewId not generated

**Symptom**: Response has `viewId: null` or undefined

**Fix**:
1. Check MongoDB index: `db.lists.getIndexes()`
2. Ensure unique sparse index on `viewId` exists
3. Restart server to trigger index creation

---

### Issue: 403 Forbidden with shareId

**Symptom**: Can't edit list even with shareId

**Debug**:
```typescript
// Add logging in API route
const permission = list.shareId === shareId ? 'edit' : 'view';
console.log('Permission detected:', permission, { shareId, listShareId: list.shareId });
```

**Common Cause**: String comparison fails due to extra whitespace

---

### Issue: Collision on viewId generation

**Symptom**: Error "Failed to generate unique IDs"

**Fix**:
1. Check MongoDB for duplicate viewIds: `db.lists.find({ viewId: "duplicateId" })`
2. Increase `maxAttempts` in `generateUniqueIds` function
3. Verify collision detection query includes all 4 cases

---

## 6. Manual Testing Checklist

### List Operations
- [ ] Create list generates both shareId and viewId
- [ ] shareId grants edit permission
- [ ] viewId grants view permission
- [ ] Old lists without viewId get one generated

### Item Operations (Edit Permission)
- [ ] Create item with shareId succeeds
- [ ] Update item with shareId succeeds
- [ ] Delete item with shareId succeeds
- [ ] Complete/uncomplete item with shareId succeeds

### Item Operations (View Permission)
- [ ] Get items with viewId succeeds
- [ ] Create item with viewId returns 403
- [ ] Update item with viewId returns 403
- [ ] Delete item with viewId returns 403

### UI Behavior
- [ ] Edit link shows all controls
- [ ] View link hides edit controls
- [ ] Copy View-Only Link button works
- [ ] Copy Edit Link button works (edit only)
- [ ] No visual indication of permission level (security)

### Error Handling
- [ ] Invalid ID format returns 400
- [ ] Non-existent ID returns 404
- [ ] Write with viewId returns 403
- [ ] Empty title returns 400

---

## 7. Performance Testing

### Response Time Check

```bash
# Measure API response time
time curl http://localhost:3000/api/lists/abc123xyz
```

**Expected**: <200ms total time

### Load Testing (Optional)

```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/lists/abc123xyz
```

**Expected**: 
- Average response time: <50ms
- No 500 errors
- No permission bypasses

---

## 8. Next Steps

After verifying basic functionality:

1. **Review Implementation**: Check [data-model.md](./data-model.md) and [research.md](./research.md)
2. **Run Full Test Suite**: `npm run test:all`
3. **Test Production Build**: `npm run build && npm start`
4. **Review Constitution Compliance**: Check [plan.md](./plan.md) Constitution Check section

---

## Resources

- **API Spec**: [contracts/api.openapi.yaml](./contracts/api.openapi.yaml)
- **Data Model**: [data-model.md](./data-model.md)
- **Research Decisions**: [research.md](./research.md)
- **Feature Spec**: [spec.md](./spec.md)
- **Constitution**: [../../.specify/memory/constitution.md](../../.specify/memory/constitution.md)

---

## Support

Issues during setup? Check:
1. MongoDB connection: `mongosh --eval "db.runCommand({ ping: 1 })"`
2. Environment variables: `cat .env.local`
3. Node version: `node --version` (should be 22+)
4. Dependencies: `npm ci` (clean install)

For implementation questions, refer to the [Feature Specification](./spec.md) or [Constitution](../../.specify/memory/constitution.md).
