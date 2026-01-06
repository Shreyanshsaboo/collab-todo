import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { isValidShareId, generateShareId, detectPermission } from '@/lib/utils';
import { requireAuth } from '@/lib/middleware/auth';
import { 
  TodoListDocument,
  TodoItemDocument,
  GetListResponse,
  UpdateListRequest,
  UpdateListResponse,
  ErrorResponse,
  serializeTodoList,
  serializeTodoItem
} from '@/lib/db-types';

// Mark this route as dynamic to prevent static optimization
export const dynamic = 'force-dynamic';

/**
 * GET /api/lists/[shareId]
 * Retrieve a todo list with all its items
 * 
 * Response: 200 OK
 * {
 *   "list": {
 *     "_id": "...",
 *     "shareId": "k3mf8qp2x",
 *     "title": "My Shopping List",
 *     "createdAt": "2026-01-05T...",
 *     "updatedAt": "2026-01-05T..."
 *   },
 *   "items": [
 *     {
 *       "_id": "...",
 *       "listId": "...",
 *       "text": "Buy milk",
 *       "completed": false,
 *       "order": 0,
 *       "createdAt": "2026-01-05T...",
 *       "updatedAt": "2026-01-05T..."
 *     }
 *   ]
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    // Validate ID format (works for both shareId and viewId)
    if (!isValidShareId(shareId)) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid ID format',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Connect to database
    const db = await connectToDatabase();
    const listsCollection = db.collection<TodoListDocument>('TodoList');
    const itemsCollection = db.collection<TodoItemDocument>('TodoItem');

    // Find the list by either shareId or viewId
    const list = await listsCollection.findOne({
      $or: [
        { shareId },
        { viewId: shareId }
      ]
    });

    if (!list) {
      const errorResponse: ErrorResponse = {
        error: 'List not found',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Lazy generation: If list doesn't have viewId (backward compatibility), generate one
    if (!list.viewId) {
      let viewId: string;
      let attempts = 0;
      const maxAttempts = 5;

      do {
        viewId = generateShareId();
        
        // Check for collisions
        const existing = await listsCollection.findOne({
          $or: [
            { shareId: viewId },
            { viewId }
          ]
        });
        
        if (!existing) {
          break; // viewId is unique
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          const errorResponse: ErrorResponse = {
            error: 'Failed to generate viewId',
          };
          return NextResponse.json(errorResponse, { status: 500 });
        }
      } while (true);

      // Update the list with the new viewId
      await listsCollection.updateOne(
        { _id: list._id },
        { $set: { viewId, updatedAt: new Date() } }
      );
      
      list.viewId = viewId;
    }

    // Detect permission based on which ID matched
    const permission = detectPermission(list, shareId);

    // Find all items for this list, sorted by order
    const items = await itemsCollection
      .find({ listId: list._id.toString() })
      .sort({ order: 1 })
      .toArray();

    // Serialize list and add permission field
    const serializedList = serializeTodoList(list as TodoListDocument & { viewId: string });
    serializedList.permission = permission;

    // Return response
    const response: GetListResponse = {
      list: serializedList,
      items: items.map(serializeTodoItem),
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error fetching todo list:', error);
    
    const errorResponse: ErrorResponse = {
      error: 'Failed to fetch todo list',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * PATCH /api/lists/[shareId]
 * Update a todo list's title
 * 
 * Request body:
 * {
 *   "title": "Updated Shopping List"
 * }
 * 
 * Response: 200 OK
 * {
 *   "list": {
 *     "_id": "...",
 *     "shareId": "k3mf8qp2x",
 *     "title": "Updated Shopping List",
 *     "createdAt": "2026-01-05T...",
 *     "updatedAt": "2026-01-05T..."
 *   }
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    // Validate shareId format
    if (!isValidShareId(shareId)) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid shareId format',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Parse request body
    const body: UpdateListRequest = await request.json();

    // Validate required fields
    if (!body.title || typeof body.title !== 'string') {
      const errorResponse: ErrorResponse = {
        error: 'Title is required and must be a string',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate title length
    if (body.title.trim().length === 0) {
      const errorResponse: ErrorResponse = {
        error: 'Title cannot be empty',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (body.title.length > 200) {
      const errorResponse: ErrorResponse = {
        error: 'Title must be 200 characters or less',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Connect to database
    const db = await connectToDatabase();
    const collection = db.collection<TodoListDocument>('TodoList');

    // Find the list by either shareId or viewId
    const list = await collection.findOne({
      $or: [
        { shareId },
        { viewId: shareId }
      ]
    });

    if (!list) {
      const errorResponse: ErrorResponse = {
        error: 'List not found',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Check permission - only 'edit' permission can update
    const permission = detectPermission(list, shareId);
    if (permission !== 'edit') {
      const errorResponse: ErrorResponse = {
        error: 'Forbidden: View-only access cannot modify list',
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    // Update the list (using the actual shareId from the found list)
    const result = await collection.findOneAndUpdate(
      { _id: list._id },
      { 
        $set: { 
          title: body.title.trim(),
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      const errorResponse: ErrorResponse = {
        error: 'List not found',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Serialize and return response (viewId guaranteed to exist from earlier check)
    const response: UpdateListResponse = {
      list: serializeTodoList(result as TodoListDocument & { viewId: string }),
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error updating todo list:', error);
    
    const errorResponse: ErrorResponse = {
      error: 'Failed to update todo list',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * DELETE /api/lists/[shareId]
 * Delete a todo list and all its items (owner only)
 * Requires authentication and ownership
 * 
 * Response: 200 OK
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    // Require authentication
    const auth = requireAuth(request);
    
    const { shareId } = await params;

    // Validate ID format
    if (!isValidShareId(shareId)) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid ID format',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Connect to database
    const db = await connectToDatabase();
    const listsCollection = db.collection<TodoListDocument>('TodoList');
    const itemsCollection = db.collection<TodoItemDocument>('TodoItem');

    // Find the list by shareId (not viewId for deletion)
    const list = await listsCollection.findOne({ shareId });

    if (!list) {
      const errorResponse: ErrorResponse = {
        error: 'List not found',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Check ownership - only owner can delete
    if (!list.userId || list.userId.toString() !== auth.userId) {
      const errorResponse: ErrorResponse = {
        error: 'Forbidden: Only the list owner can delete this list',
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    // Delete all items belonging to this list
    await itemsCollection.deleteMany({ listId: list._id.toString() });

    // Delete the list itself
    await listsCollection.deleteOne({ _id: list._id });

    // Return success message
    return NextResponse.json(
      { message: 'List deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    // Check if error is from authentication
    if (error instanceof Error && error.message === 'Authentication required') {
      const errorResponse: ErrorResponse = {
        error: 'Authentication required',
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }
    
    console.error('Error deleting todo list:', error);
    
    const errorResponse: ErrorResponse = {
      error: 'Failed to delete todo list',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
