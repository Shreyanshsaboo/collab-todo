import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import { isValidShareId, detectPermission } from '@/lib/utils';
import { 
  TodoListDocument,
  TodoItemDocument,
  UpdateItemRequest,
  UpdateItemResponse,
  DeleteItemResponse,
  ErrorResponse,
  serializeTodoItem
} from '@/lib/db-types';

/**
 * PATCH /api/lists/[shareId]/items/[itemId]
 * Update a todo item's text, completion status, or order
 * 
 * Request body (all fields optional):
 * {
 *   "text": "Buy organic milk",
 *   "completed": true,
 *   "order": 2
 * }
 * 
 * Response: 200 OK
 * {
 *   "item": {
 *     "_id": "...",
 *     "listId": "...",
 *     "text": "Buy organic milk",
 *     "completed": true,
 *     "order": 2,
 *     "createdAt": "2026-01-05T...",
 *     "updatedAt": "2026-01-05T..."
 *   }
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string; itemId: string }> }
) {
  try {
    const { shareId, itemId } = await params;

    // Validate shareId format
    if (!isValidShareId(shareId)) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid shareId format',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate itemId format
    if (!ObjectId.isValid(itemId)) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid itemId format',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Parse request body
    const body: UpdateItemRequest = await request.json();

    // Validate that at least one field is provided
    if (body.text === undefined && body.completed === undefined && body.order === undefined) {
      const errorResponse: ErrorResponse = {
        error: 'At least one field (text, completed, or order) must be provided',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Build update object
    const updateFields: Partial<TodoItemDocument> = {
      updatedAt: new Date(),
    };

    // Validate and add text if provided
    if (body.text !== undefined) {
      if (typeof body.text !== 'string') {
        const errorResponse: ErrorResponse = {
          error: 'Text must be a string',
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }

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

      updateFields.text = body.text.trim();
    }

    // Validate and add completed if provided
    if (body.completed !== undefined) {
      if (typeof body.completed !== 'boolean') {
        const errorResponse: ErrorResponse = {
          error: 'Completed must be a boolean',
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }

      updateFields.completed = body.completed;
    }

    // Validate and add order if provided
    if (body.order !== undefined) {
      if (typeof body.order !== 'number' || !Number.isInteger(body.order) || body.order < 0) {
        const errorResponse: ErrorResponse = {
          error: 'Order must be a non-negative integer',
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }

      updateFields.order = body.order;
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

    // Check permission - only 'edit' permission can update items
    const permission = detectPermission(list, shareId);
    if (permission !== 'edit') {
      const errorResponse: ErrorResponse = {
        error: 'Forbidden: View-only access cannot update items',
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    // Update the item
    const result = await itemsCollection.findOneAndUpdate(
      { 
        _id: new ObjectId(itemId),
        listId: list._id.toString() // Ensure item belongs to this list
      },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      const errorResponse: ErrorResponse = {
        error: 'Item not found',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Update list's updatedAt timestamp
    await listsCollection.updateOne(
      { _id: list._id },
      { $set: { updatedAt: new Date() } }
    );

    // Serialize and return response
    const response: UpdateItemResponse = {
      item: serializeTodoItem(result),
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error updating todo item:', error);
    
    const errorResponse: ErrorResponse = {
      error: 'Failed to update todo item',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * DELETE /api/lists/[shareId]/items/[itemId]
 * Delete a todo item from a list
 * 
 * Response: 200 OK
 * {
 *   "success": true
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string; itemId: string }> }
) {
  try {
    const { shareId, itemId } = await params;

    // Validate shareId format
    if (!isValidShareId(shareId)) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid shareId format',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate itemId format
    if (!ObjectId.isValid(itemId)) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid itemId format',
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

    // Check permission - only 'edit' permission can delete items
    const permission = detectPermission(list, shareId);
    if (permission !== 'edit') {
      const errorResponse: ErrorResponse = {
        error: 'Forbidden: View-only access cannot delete items',
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    // Delete the item
    const result = await itemsCollection.deleteOne({
      _id: new ObjectId(itemId),
      listId: list._id.toString() // Ensure item belongs to this list
    });

    if (result.deletedCount === 0) {
      const errorResponse: ErrorResponse = {
        error: 'Item not found',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Update list's updatedAt timestamp
    await listsCollection.updateOne(
      { _id: list._id },
      { $set: { updatedAt: new Date() } }
    );

    // Return success response
    const response: DeleteItemResponse = {
      success: true,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error deleting todo item:', error);
    
    const errorResponse: ErrorResponse = {
      error: 'Failed to delete todo item',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
