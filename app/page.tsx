import Link from "next/link";
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  // Check if user is authenticated
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (token) {
    try {
      verifyToken(token);
      // User is authenticated, redirect to dashboard
      redirect('/dashboard');
    } catch {
      // Invalid token, continue to show landing page
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold text-gray-900 mb-6">
              Collab Todo
            </h1>
            <p className="text-2xl text-gray-600 mb-4">
              Collaborative todo lists with instant sharing
            </p>
            <p className="text-lg text-gray-500 mb-8">
              Create a list, share the link, and collaborate in real-time
            </p>
            
            {/* CTA Buttons */}
            <div className="flex gap-4 justify-center mb-12">
              <Link 
                href="/signup" 
                className="px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Get Started Free
              </Link>
              <Link 
                href="/signin" 
                className="px-8 py-4 bg-white text-gray-700 text-lg rounded-lg hover:bg-gray-50 font-semibold shadow-lg hover:shadow-xl transition-all border-2 border-gray-200"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-5xl mb-4">🔗</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Instant Sharing
              </h3>
              <p className="text-gray-600">
                Share via link - no signup required for viewers. Anyone with the link can collaborate.
              </p>
            </div>
            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-5xl mb-4">👥</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Real Collaboration
              </h3>
              <p className="text-gray-600">
                Everyone sees updates automatically. Work together seamlessly in real-time.
              </p>
            </div>
            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Simple & Fast
              </h3>
              <p className="text-gray-600">
                Clean interface, no complexity. Create lists and start collaborating in seconds.
              </p>
            </div>
          </div>

          {/* How it Works */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Sign Up</h4>
                <p className="text-sm text-gray-600">Create your free account in seconds</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">2</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Create a List</h4>
                <p className="text-sm text-gray-600">Give your list a name and add items</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">3</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Share & Collaborate</h4>
                <p className="text-sm text-gray-600">Share the link and work together</p>
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Ready to get started?</p>
            <Link 
              href="/signup" 
              className="inline-block px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Create Your Free Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
