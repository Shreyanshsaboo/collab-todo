import { NextRequest, NextResponse } from 'next/server';
import type { OptionalUnlessRequiredId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import { isValidShareId, detectPermission } from '@/lib/utils';
import { 
  TodoListDocument,
  TodoItemDocument,
  CreateItemRequest,
  CreateItemResponse,
  ErrorResponse,
  serializeTodoItem
} from '@/lib/db-types';

// Mark this route as dynamic to prevent static optimization
export const dynamic = 'force-dynamic';

/**
 * POST /api/lists/[shareId]/items
 * Create a new todo item in a list
 * 
 * Request body:
 * {
 *   "text": "Buy milk"
 * }
 * 
 * Response: 201 Created
 * {
 *   "item": {
 *     "_id": "...",
 *     "listId": "...",
 *     "text": "Buy milk",
 *     "completed": false,
 *     "order": 0,
 *     "createdAt": "2026-01-05T...",
 *     "updatedAt": "2026-01-05T..."
 *   }
 * }
 */
export async function POST(
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
    const body: CreateItemRequest = await request.json();

    // Validate required fields
    if (!body.text || typeof body.text !== 'string') {
      const errorResponse: ErrorResponse = {
        error: 'Text is required and must be a string',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate text length
    if (body.text.trim().length === 0) {
      const errorResponse: ErrorResponse = {
        error: 'Text cannot be empty',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (body.text.length > 500) {
      const errorResponse: ErrorResponse = {
        error: 'Text must be 500 characters or less',
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

    // Check permission - only 'edit' permission can create items
    const permission = detectPermission(list, shareId);
    if (permission !== 'edit') {
      const errorResponse: ErrorResponse = {
        error: 'Forbidden: View-only access cannot create items',
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    // Get the next order value (highest order + 1)
    const lastItem = await itemsCollection
      .find({ listId: list._id.toString() })
      .sort({ order: -1 })
      .limit(1)
      .toArray();
    
    const nextOrder = lastItem.length > 0 ? lastItem[0].order + 1 : 0;

    // Create new todo item document
    const now = new Date();
    const newItem = {
      listId: list._id.toString(),
      text: body.text.trim(),
      completed: false,
      order: nextOrder,
      createdAt: now,
      updatedAt: now,
    };

    // Insert into database (MongoDB will generate _id)
    const result = await itemsCollection.insertOne(newItem as OptionalUnlessRequiredId<TodoItemDocument>);

    // Add _id to the document for serialization
    const createdItem: TodoItemDocument = {
      ...newItem,
      _id: result.insertedId,
    };

    // Update list's updatedAt timestamp
    await listsCollection.updateOne(
      { _id: list._id },
      { $set: { updatedAt: now } }
    );

    // Serialize and return response
    const response: CreateItemResponse = {
      item: serializeTodoItem(createdItem),
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Error creating todo item:', error);
    
    const errorResponse: ErrorResponse = {
      error: 'Failed to create todo item',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
