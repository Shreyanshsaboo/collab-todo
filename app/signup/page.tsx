import { SignupForm } from '@/components/SignupForm';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="mt-2 text-gray-600">
            Start organizing your tasks with collaborative to-do lists
          </p>
        </div>
        
        <SignupForm />
        
        <div className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/signin" className="text-blue-500 hover:text-blue-600 font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
