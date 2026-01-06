/* eslint-disable react-hooks/error-boundaries */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { CreateListForm } from '@/components/CreateListForm';
import { Header } from '@/components/Header';

export default async function CreatePage() {
  // Check if user is authenticated
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) {
    redirect('/signin');
  }
  
  try {
    const auth = verifyToken(token);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header email={auth.email} />
        
        <div className="flex items-center justify-center p-4 pt-16">
          <div className="max-w-2xl w-full">
            {/* User Info */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Create New List
              </h1>
            </div>

          {/* Create List Form */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <CreateListForm />
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              After creating your list, you'll get a shareable link that anyone can use to collaborate.
            </p>
          </div>
        </div>
        </div>
      </div>
    );
  } catch (error) {
    // Token is invalid or expired
    redirect('/signin');
  }
}
