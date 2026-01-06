import { ObjectId } from 'mongodb';

// ============================================================================
// Database Document Types (MongoDB representation)
// ============================================================================

/**
 * User document as stored in MongoDB
 */
export interface UserDocument {
  _id: ObjectId;
  email: string;             // User's email (unique, lowercase, case-insensitive index)
  passwordHash: string;      // bcrypt hash with cost factor 12
  createdAt: Date;
  updatedAt: Date;
}

/**
 * TodoList document as stored in MongoDB
 */
export interface TodoListDocument {
  _id: ObjectId;
  userId?: ObjectId;         // Optional owner reference (for backward compatibility with existing lists)
  shareId: string;           // Unique 9-character alphanumeric identifier (edit permission)
  viewId?: string;           // Unique 9-character alphanumeric identifier (view permission, optional for backward compatibility)
  title: string;             // List title (max 200 chars)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * TodoItem document as stored in MongoDB
 */
export interface TodoItemDocument {
  _id: ObjectId;
  listId: string;            // Reference to TodoList._id (stored as string)
  text: string;              // Task description (max 500 chars)
  completed: boolean;        // Completion status
  order: number;             // Sort order (integer with gaps)
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Permission Types
// ============================================================================

/**
 * Permission level for list access
 * - 'view': Read-only access (via viewId)
 * - 'edit': Full read/write access (via shareId)
 */
export type Permission = 'view' | 'edit';

// ============================================================================
// API Response Types (Serialized for JSON)
// ============================================================================

/**
 * User as returned by API (ObjectId → string, Date → ISO string, passwordHash excluded)
 */
export interface UserAPI {
  _id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * TodoList as returned by API (ObjectId → string, Date → ISO string)
 */
export interface TodoList {
  _id: string;
  shareId: string;
  viewId: string;            // Always present in API response (generated if missing)
  title: string;
  createdAt: string;
  updatedAt: string;
  permission?: Permission;   // Optional: Included when list is fetched with permission context
}

/**
 * TodoItem as returned by API (ObjectId → string, Date → ISO string)
 */
export interface TodoItem {
  _id: string;
  text: string;
  completed: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// API Request Body Types
// ============================================================================

/**
 * Request body for creating a new list
 */
export interface CreateListRequest {
  title: string;
}

/**
 * Request body for updating a list
 */
export interface UpdateListRequest {
  title?: string;
}

/**
 * Request body for creating a new item
 */
export interface CreateItemRequest {
  text: string;
}

/**
 * Request body for updating an item
 */
export interface UpdateItemRequest {
  text?: string;
  completed?: boolean;
  order?: number;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response for GET /api/lists/[shareId]
 */
export interface GetListResponse {
  list: TodoList;
  items: TodoItem[];
}

/**
 * Response for POST /api/lists
 */
export interface CreateListResponse {
  list: TodoList;
}

/**
 * Response for PATCH /api/lists/[shareId]
 */
export interface UpdateListResponse {
  list: TodoList;
}

/**
 * Response for POST /api/lists/[shareId]/items
 */
export interface CreateItemResponse {
  item: TodoItem;
}

/**
 * Response for PATCH /api/lists/[shareId]/items/[itemId]
 */
export interface UpdateItemResponse {
  item: TodoItem;
}

/**
 * Response for DELETE /api/lists/[shareId]/items/[itemId]
 */
export interface DeleteItemResponse {
  success: boolean;
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts a MongoDB document to API response format
 * Note: viewId should always be present in API responses (generated if missing)
 */
export function serializeTodoList(doc: TodoListDocument & { viewId: string }): TodoList {
  return {
    _id: doc._id.toString(),
    shareId: doc.shareId,
    viewId: doc.viewId,
    title: doc.title,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/**
 * Converts a MongoDB document to API response format
 */
export function serializeTodoItem(doc: TodoItemDocument): TodoItem {
  return {
    _id: doc._id.toString(),
    text: doc.text,
    completed: doc.completed,
    order: doc.order,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
