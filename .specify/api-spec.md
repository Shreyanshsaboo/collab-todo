# API Specification

Base URL: `http://localhost:3000` (development)

---

## Lists

### Create List
```http
POST /api/lists
Content-Type: application/json

{
  "title": "My Todo List"
}
```

**Success Response (201 Created)**:
```json
{
  "list": {
    "_id": "507f1f77bcf86cd799439011",
    "shareId": "abc123xyz",
    "title": "My Todo List",
    "createdAt": "2026-01-05T12:00:00.000Z",
    "updatedAt": "2026-01-05T12:00:00.000Z"
  }
}
```

**Error Response (400 Bad Request)**:
```json
{
  "error": "Title is required"
}
```

---

### Get List with Items
```http
GET /api/lists/abc123xyz
```

**Success Response (200 OK)**:
```json
{
  "list": {
    "_id": "507f1f77bcf86cd799439011",
    "shareId": "abc123xyz",
    "title": "My Todo List",
    "createdAt": "2026-01-05T12:00:00.000Z",
    "updatedAt": "2026-01-05T12:00:00.000Z"
  },
  "items": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "text": "Buy groceries",
      "completed": false,
      "order": 0,
      "createdAt": "2026-01-05T12:01:00.000Z",
      "updatedAt": "2026-01-05T12:01:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "text": "Walk the dog",
      "completed": true,
      "order": 1,
      "createdAt": "2026-01-05T12:02:00.000Z",
      "updatedAt": "2026-01-05T12:03:00.000Z"
    }
  ]
}
```

**Error Response (404 Not Found)**:
```json
{
  "error": "List not found"
}
```

---

### Update List
```http
PATCH /api/lists/abc123xyz
Content-Type: application/json

{
  "title": "Updated List Title"
}
```

**Success Response (200 OK)**:
```json
{
  "list": {
    "_id": "507f1f77bcf86cd799439011",
    "shareId": "abc123xyz",
    "title": "Updated List Title",
    "createdAt": "2026-01-05T12:00:00.000Z",
    "updatedAt": "2026-01-05T12:30:00.000Z"
  }
}
```

**Error Response (404 Not Found)**:
```json
{
  "error": "List not found"
}
```

---

## Items

### Create Item
```http
POST /api/lists/abc123xyz/items
Content-Type: application/json

{
  "text": "New todo item"
}
```

**Success Response (201 Created)**:
```json
{
  "item": {
    "_id": "507f1f77bcf86cd799439014",
    "text": "New todo item",
    "completed": false,
    "order": 2,
    "createdAt": "2026-01-05T12:05:00.000Z",
    "updatedAt": "2026-01-05T12:05:00.000Z"
  }
}
```

**Error Responses**:
- **400 Bad Request**: `{ "error": "Text is required" }`
- **404 Not Found**: `{ "error": "List not found" }`

---

### Update Item
```http
PATCH /api/lists/abc123xyz/items/507f1f77bcf86cd799439014
Content-Type: application/json

{
  "completed": true
}
```

or

```json
{
  "text": "Updated todo text",
  "completed": true
}
```

or

```json
{
  "order": 5
}
```

**Success Response (200 OK)**:
```json
{
  "item": {
    "_id": "507f1f77bcf86cd799439014",
    "text": "New todo item",
    "completed": true,
    "order": 2,
    "createdAt": "2026-01-05T12:05:00.000Z",
    "updatedAt": "2026-01-05T12:10:00.000Z"
  }
}
```

**Error Response (404 Not Found)**:
```json
{
  "error": "Item not found"
}
```

---

### Delete Item
```http
DELETE /api/lists/abc123xyz/items/507f1f77bcf86cd799439014
```

**Success Response (204 No Content)**:
- Empty body

**Error Response (404 Not Found)**:
```json
{
  "error": "Item not found"
}
```

---

## Data Types

### TodoList
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| _id | string | Yes | MongoDB ObjectId |
| shareId | string | Yes | Unique 9-char identifier |
| title | string | Yes | List title |
| createdAt | string (ISO 8601) | Yes | Creation timestamp |
| updatedAt | string (ISO 8601) | Yes | Last update timestamp |

### TodoItem
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| _id | string | Yes | MongoDB ObjectId |
| text | string | Yes | Item description |
| completed | boolean | Yes | Completion status |
| order | number | Yes | Sort order (0-indexed) |
| createdAt | string (ISO 8601) | Yes | Creation timestamp |
| updatedAt | string (ISO 8601) | Yes | Last update timestamp |

---

## Error Codes

| Status Code | Meaning |
|-------------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created successfully |
| 204 | No Content - Request succeeded with no response body |
| 400 | Bad Request - Invalid input data |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error - Server-side error |

---

## Implementation Notes

### Request Validation
- All request bodies must be valid JSON
- Required fields must be present
- Empty strings are invalid for text fields

### Response Format
- All timestamps are ISO 8601 strings
- ObjectIds are serialized as strings
- Errors always include an `error` field with description

### Concurrency
- Last write wins for conflicts
- Clients should poll for updates every 5 seconds
- No optimistic locking in v1

### ShareId Generation
- 9 characters: lowercase letters (a-z) and numbers (0-9)
- Generated randomly on list creation
- Collision checking: regenerate if exists

### Item Ordering
- `order` field determines display sequence
- New items get max(order) + 1
- Reordering updates `order` values
