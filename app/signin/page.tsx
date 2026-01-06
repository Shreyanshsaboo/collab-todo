import { SigninForm } from '@/components/SigninForm';
import Link from 'next/link';

export default function SigninPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Sign In</h1>
          <p className="mt-2 text-gray-600">
            Access your collaborative to-do lists
          </p>
        </div>
        
        <SigninForm />
        
        <div className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/signup" className="text-blue-500 hover:text-blue-600 font-medium">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
