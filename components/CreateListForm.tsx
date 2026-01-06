'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * CreateListForm Component
 * 
 * Form for creating a new todo list on the landing page
 */
export function CreateListForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmedTitle }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create list');
      }

      const data = await response.json();
      
      // Redirect to the new list
      router.push(`/list/${data.list.shareId}`);
    } catch (err) {
      console.error('Error creating list:', err);
      setError(err instanceof Error ? err.message : 'Failed to create list');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="list-title" className="block text-sm font-medium text-gray-700 mb-2">
          List Name
        </label>
        <input
          id="list-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Shopping List, Project Tasks..."
          disabled={isLoading}
          maxLength={200}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-lg"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !title.trim()}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold text-lg"
      >
        {isLoading ? 'Creating...' : 'Create List'}
      </button>
    </form>
  );
}
