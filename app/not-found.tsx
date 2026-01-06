import Link from 'next/link';

/**
 * Custom 404 Not Found Page
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
        <div className="text-6xl mb-4">📝</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          List Not Found
        </h1>
        <p className="text-gray-600 mb-6">
          This list doesn&apos;t exist or the link may be incorrect.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Create a New List
        </Link>
      </div>
    </div>
  );
}
