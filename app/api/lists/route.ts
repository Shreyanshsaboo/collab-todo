import { NextRequest, NextResponse } from 'next/server';
import type { OptionalUnlessRequiredId } from 'mongodb';
import { ObjectId } from 'mongodb';
import { connectToDatabase, initializeIndexes } from '@/lib/mongodb';
import { generateShareId } from '@/lib/utils';
import { requireAuth } from '@/lib/middleware/auth';
import { 
  TodoListDocument, 
  CreateListRequest, 
  CreateListResponse,
  ErrorResponse,
  serializeTodoList 
} from '@/lib/db-types';

// Mark this route as dynamic to prevent static optimization
export const dynamic = 'force-dynamic';

/**
 * GET /api/lists
 * Get all lists owned by the authenticated user
 * Requires authentication
 * 
 * Response: 200 OK
 * {
 *   "lists": [...]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const auth = requireAuth(request);
    
    // Connect to database
    const db = await connectToDatabase();
    const collection = db.collection<TodoListDocument>('TodoList');
    
    // Find lists owned by authenticated user
    const lists = await collection
      .find({ userId: new ObjectId(auth.userId) })
      .sort({ updatedAt: -1 })
      .toArray();
    
    // Serialize lists
    const serializedLists = lists.map(list => serializeTodoList({
      ...list,
      viewId: list.viewId || '',
    }));
    
    return NextResponse.json({ lists: serializedLists });
    
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      const errorResponse: ErrorResponse = {
        error: 'Authentication required',
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }
    
    console.error('Error fetching owned lists:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to fetch lists',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST /api/lists
 * Create a new todo list with a unique shareId (requires authentication)
 * 
 * Request body:
 * {
 *   "title": "My Shopping List"
 * }
 * 
 * Response: 201 Created
 * {
 *   "list": {
 *     "_id": "...",
 *     "shareId": "k3mf8qp2x",
 *     "title": "My Shopping List",
 *     "createdAt": "2026-01-05T...",
 *     "updatedAt": "2026-01-05T..."
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const auth = requireAuth(request);
    
    // Parse request body
    const body: CreateListRequest = await request.json();
    
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

    // Ensure indexes are created (idempotent operation)
    await initializeIndexes();

    // Generate unique shareId and viewId (retry up to 5 times if collision occurs)
    let shareId: string;
    let viewId: string;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      shareId = generateShareId();
      viewId = generateShareId();
      
      // Ensure shareId and viewId are different
      if (shareId === viewId) {
        continue;
      }
      
      // Check for collisions with existing shareId or viewId (cross-collision check)
      const existing = await collection.findOne({
        $or: [
          { shareId },
          { viewId: shareId },  // Check if our shareId collides with existing viewId
          { shareId: viewId },  // Check if our viewId collides with existing shareId
          { viewId }
        ]
      });
      
      if (!existing) {
        break; // Both IDs are unique
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        const errorResponse: ErrorResponse = {
          error: 'Failed to generate unique IDs. Please try again.',
        };
        return NextResponse.json(errorResponse, { status: 500 });
      }
    } while (true);

    // Create new todo list document
    const now = new Date();
    const newList = {
      userId: new ObjectId(auth.userId),  // Associate with authenticated user
      shareId,
      viewId,  // Add view-only access identifier
      title: body.title.trim(),
      createdAt: now,
      updatedAt: now,
    };

    // Insert into database (MongoDB will generate _id)
    const result = await collection.insertOne(newList as OptionalUnlessRequiredId<TodoListDocument>);

    // Add _id to the document for serialization
    const createdList: TodoListDocument & { viewId: string } = {
      ...newList,
      _id: result.insertedId,
    };

    // Serialize and return response
    const response: CreateListResponse = {
      list: serializeTodoList(createdList),
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    // Check if error is from authentication
    if (error instanceof Error && error.message === 'Authentication required') {
      const errorResponse: ErrorResponse = {
        error: 'Authentication required',
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }
    
    console.error('Error creating todo list:', error);
    
    const errorResponse: ErrorResponse = {
      error: 'Failed to create todo list',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
