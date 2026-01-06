import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';
import { isValidShareId, generateShareId, detectPermission } from '@/lib/utils';
import { verifyToken } from '@/lib/auth';
import { TodoListDocument, TodoItemDocument, serializeTodoList, serializeTodoItem } from '@/lib/db-types';
import { TodoListClient } from '@/components/TodoListClient';

interface PageProps {
  params: Promise<{
    shareId: string;
  }>;
}

/**
 * Server Component: List View Page
 * 
 * Fetches the todo list data and renders the client component
 */
export default async function ListPage({ params }: PageProps) {
  const { shareId } = await params;

  // Validate ID format (works for both shareId and viewId)
  if (!isValidShareId(shareId)) {
    notFound();
  }

  try {
    // Check authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token');
    let currentUserId: string | null = null;

    if (token) {
      try {
        const payload = verifyToken(token.value);
        currentUserId = payload.userId;
      } catch {
        // Invalid token, user is not authenticated
        currentUserId = null;
      }
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
      notFound();
    }

    // Lazy generation: If list doesn't have viewId, generate one
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
          break;
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error('Failed to generate viewId');
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

    // Check if current user is the owner
    const isOwner = currentUserId !== null && 
                    list.userId !== undefined && 
                    list.userId.toString() === currentUserId;

    // Get user email if authenticated
    let userEmail: string | undefined;
    if (currentUserId && token) {
      try {
        const payload = verifyToken(token.value);
        userEmail = payload.email;
      } catch {
        userEmail = undefined;
      }
    }

    // Find all items for this list, sorted by order
    const items = await itemsCollection
      .find({ listId: list._id.toString() })
      .sort({ order: 1 })
      .toArray();

    // Serialize data for client component
    const serializedList = serializeTodoList(list as TodoListDocument & { viewId: string });
    const serializedItems = items.map(serializeTodoItem);

    return (
      <TodoListClient 
        initialList={serializedList} 
        initialItems={serializedItems}
        permission={permission}
        isOwner={isOwner}
        userEmail={userEmail}
      />
    );
  } catch (error) {
    console.error('Error loading list:', error);
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Error Loading List
          </h1>
          <p className="text-gray-600 mb-6">
            Something went wrong while loading this list. Please try again later.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }
}

/**
 * Generate metadata for the page
 */
export async function generateMetadata({ params }: PageProps) {
  const { shareId } = await params;

  if (!isValidShareId(shareId)) {
    return {
      title: 'List Not Found | Collab Todo',
    };
  }

  try {
    const db = await connectToDatabase();
    const listsCollection = db.collection<TodoListDocument>('TodoList');
    const list = await listsCollection.findOne({
      $or: [
        { shareId },
        { viewId: shareId }
      ]
    });

    if (!list) {
      return {
        title: 'List Not Found | Collab Todo',
      };
    }

    return {
      title: `${list.title} | Collab Todo`,
      description: `Collaborative todo list: ${list.title}`,
    };
  } catch {
    return {
      title: 'Collab Todo',
    };
  }
}
