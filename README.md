# Collab Todo

A link-based collaborative to-do application that allows multiple users to access the same task list via shareable links with view-only or edit permissions.

## Features

- **No Authentication Required**: Share lists instantly via links
- **Dual Permission Links**: 
  - **Edit Links** (via `shareId`): Full access to create, edit, and delete items
  - **View Links** (via `viewId`): Read-only access for sharing with viewers
- **Real-Time Collaboration**: Changes sync automatically across all users (5-second polling)
- **Permission Enforcement**: API-level security prevents unauthorized write operations
- **Backward Compatible**: Old lists without viewId automatically generate one on first access
- **Simple & Fast**: Create, share, and collaborate in seconds

## Tech Stack

- **Frontend**: Next.js 16 App Router, React 19, TypeScript 5, TailwindCSS 4
- **Backend**: Next.js API Routes (serverless-compatible)
- **Database**: MongoDB 8+

## Architecture

See [.specify/architecture.md](.specify/architecture.md) for detailed architecture documentation.
See [.specify/memory/constitution.md](.specify/memory/constitution.md) for project governance and core principles.

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB 8+ (local or Atlas)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd collab-todo
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your MongoDB connection string
```

4. Run MongoDB (if using local instance):
```bash
# macOS with Homebrew
brew services start mongodb-community

# Or using Docker
docker run -d -p 27017:27017 mongo:8
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
collab-todo/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   └── lists/            # Todo list endpoints
│   ├── list/[shareId]/       # List view page
│   └── page.tsx              # Landing page
├── components/               # React components
│   ├── TodoListClient.tsx    # Main list component (client-side)
│   ├── TodoItemComponent.tsx # Todo item display
│   ├── AddItemForm.tsx       # Add item form
│   ├── ShareLink.tsx         # Share link display
│   ├── EditListTitle.tsx     # Inline title editing
│   └── CreateListForm.tsx    # Landing page form
├── lib/                      # Shared utilities
│   ├── mongodb.ts            # Database connection
│   ├── db-types.ts           # TypeScript interfaces
│   └── utils.ts              # Helper functions
├── .specify/                 # Project specifications
│   ├── memory/
│   │   └── constitution.md   # Project governance (v2.0.0)
│   ├── architecture.md       # Architecture overview
│   └── templates/            # Specification templates
└── specs/                    # Feature specifications
    └── 001-collab-todo-link/ # MVP feature spec
```

## Development

### Build

```bash
npm run build
```

### Run Tests

```bash
npm test
```

### Database Connection Test

```bash
npx dotenv -e .env.local -- npx tsx scripts/test-db-connection.ts
```

## Permission Model

**Current (v2.1.0 - View-Only Links)**:
- Every list has two unique identifiers:
  - **`shareId`**: Edit permission - full CRUD access
  - **`viewId`**: View permission - read-only access
- **Edit Links**: `https://collab-todo.com/list/{shareId}` 
  - Full UI controls (add items, edit title, delete items)
  - Can create, update, and delete via API
- **View Links**: `https://collab-todo.com/list/{viewId}`
  - Read-only UI (no add/edit/delete controls)
  - GET requests work, POST/PATCH/DELETE return 403 Forbidden
- **Lazy Generation**: Old lists without `viewId` automatically generate one on first access
- **Collision Prevention**: Both IDs are checked for uniqueness across shareId and viewId fields

## API Endpoints

| Endpoint | Method | Permission | Description |
|----------|--------|-----------|-------------|
| `/api/lists` | POST | None | Create new list (generates both shareId and viewId) |
| `/api/lists/[id]` | GET | View/Edit | Get list and items (accepts shareId or viewId) |
| `/api/lists/[id]` | PATCH | Edit | Update list title (403 if accessed with viewId) |
| `/api/lists/[id]` | DELETE | Edit | Delete list and all items (403 if accessed with viewId) |
| `/api/lists/[id]/items` | POST | Edit | Add item (403 if accessed with viewId) |
| `/api/lists/[id]/items/[itemId]` | PATCH | Edit | Update item (403 if accessed with viewId) |
| `/api/lists/[id]/items/[itemId]` | DELETE | Edit | Delete item (403 if accessed with viewId) |

See [specs/002-view-only-links/contracts/api.openapi.yaml](specs/002-view-only-links/contracts/api.openapi.yaml) for detailed API documentation.

## Usage Examples

### Creating a List with Dual Access

```bash
curl -X POST http://localhost:3000/api/lists \
  -H "Content-Type: application/json" \
  -d '{"title": "Team Sprint Tasks"}'
```

Response:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "shareId": "abc123xyz",
  "viewId": "def456uvw",
  "title": "Team Sprint Tasks",
  "createdAt": "2026-01-06T12:00:00.000Z",
  "updatedAt": "2026-01-06T12:00:00.000Z"
}
```

### Sharing Links

- **Edit Link** (team members): `https://collab-todo.com/list/abc123xyz`
- **View Link** (stakeholders): `https://collab-todo.com/list/def456uvw`

### Accessing with View Permission

```bash
# GET works - returns permission: "view"
curl http://localhost:3000/api/lists/def456uvw

# POST fails with 403 Forbidden
curl -X POST http://localhost:3000/api/lists/def456uvw/items \
  -H "Content-Type: application/json" \
  -d '{"text": "New task"}'
# Response: {"error": "Forbidden: View-only access cannot create items"}
```

For more examples, see [specs/002-view-only-links/quickstart.md](specs/002-view-only-links/quickstart.md).

## Constitution & Governance

This project follows strict governance principles defined in [.specify/memory/constitution.md](.specify/memory/constitution.md):

- **Link-Based Access Control**: No user accounts, permission via links
- **Backend as Single Source of Truth**: All mutations server-side
- **Explicit Specifications**: Features require formal specs before implementation
- **Clear Separation of Concerns**: Data, API, and UI layers strictly separated
- **TypeScript Everywhere**: Strict typing across the stack
- **Simplicity First**: YAGNI principle, avoid premature optimization

## Contributing

1. Review the [constitution](.specify/memory/constitution.md) for core principles
2. Create a feature specification in `specs/`
3. Get approval before implementation
4. Follow the development workflow defined in the constitution
5. Ensure all quality gates pass (TypeScript compilation, permission checks, edge case testing)

## License

MIT
