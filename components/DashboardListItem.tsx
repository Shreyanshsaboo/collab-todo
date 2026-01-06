'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TodoList } from '@/lib/db-types';

interface DashboardListItemProps {
  list: TodoList;
}

export function DashboardListItem({ list }: DashboardListItemProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/lists/${list.shareId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete list');
      }

      // Refresh the page to update the list
      router.refresh();
    } catch (err) {
      console.error('Error deleting list:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete list');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="flex items-start gap-4 p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
        <Link
          href={`/list/${list.shareId}`}
          className="flex-1 min-w-0"
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
        
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex-shrink-0 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          title="Delete this list"
        >
          Delete
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Delete List?
            </h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete &quot;{list.title}&quot;? This will permanently delete the list and all its items. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
