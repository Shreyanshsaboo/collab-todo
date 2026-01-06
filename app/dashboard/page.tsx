/* eslint-disable react-hooks/error-boundaries */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { TodoListDocument } from '@/lib/db-types';
import Link from 'next/link';
import { Header } from '@/components/Header';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) {
    redirect('/signin');
  }
  
  try {
    const auth = verifyToken(token);
    const db = await connectToDatabase();
    
    // Fetch user's owned lists
    const lists = await db
      .collection('TodoList')
      .find({ userId: new ObjectId(auth.userId) })
      .sort({ updatedAt: -1 })
      .toArray() as TodoListDocument[];
    
    return (
      <div className="min-h-screen bg-gray-50">
        <Header email={auth.email} />
        
        <div className="p-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Lists</h1>
            </div>
          
          {/* Create New List Button */}
          <div className="mb-6">
            <Link
              href="/create"
              className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
            >
              + Create New List
            </Link>
          </div>
          
          {/* Lists Grid */}
          {lists.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-5xl mb-4">📝</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No lists yet
              </h2>
              <p className="text-gray-600 mb-4">
                Create your first collaborative to-do list
              </p>
              <Link
                href="/create"
                className="inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
              >
                Create List
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {lists.map((list) => (
                <Link
                  key={list._id.toString()}
                  href={`/list/${list.shareId}`}
                  className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {list.title}
                  </h2>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>
                      Created {new Date(list.createdAt).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span>
                      Updated {new Date(list.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    );
  } catch (error) {
    // Token is invalid or expired
    redirect('/signin');
  }
}
