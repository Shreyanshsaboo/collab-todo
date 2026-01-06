'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TodoList, TodoItem, Permission } from '@/lib/db-types';
import { TodoItemComponent } from './TodoItemComponent';
import { AddItemForm } from './AddItemForm';
import { ShareLink } from './ShareLink';
import { EditListTitle } from './EditListTitle';

interface TodoListClientProps {
  initialList: TodoList;
  initialItems: TodoItem[];
  permission: Permission;
  isOwner: boolean;
  userEmail?: string;
}

/**
 * TodoListClient Component
 * 
 * Manages the state and polling for a todo list
 * Provides real-time collaboration through 5-second polling
 */
export function TodoListClient({ initialList, initialItems, permission, isOwner, userEmail }: TodoListClientProps) {
  const router = useRouter();
  const [list, setList] = useState<TodoList>(initialList);
  const [items, setItems] = useState<TodoItem[]>(initialItems);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Fetch latest data from server
  const fetchList = useCallback(async () => {
    try {
      const response = await fetch(`/api/lists/${list.shareId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch list');
      }

      const data = await response.json();
      setList(data.list);
      setItems(data.items);
      setError(null);
    } catch (err) {
      console.error('Error fetching list:', err);
      setError('Failed to sync with server');
    }
  }, [list.shareId]);

  // Set up polling interval (5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchList();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchList]);

  // Handle adding a new item
  const handleAddItem = async (text: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/lists/${list.shareId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add item');
      }

      // Refresh list to get the new item
      await fetchList();
    } catch (err) {
      console.error('Error adding item:', err);
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle toggling item completion
  const handleToggleComplete = async (itemId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/lists/${list.shareId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update item');
      }

      // Optimistically update UI
      setItems(prevItems =>
        prevItems.map(item =>
          item._id === itemId ? { ...item, completed, updatedAt: new Date().toISOString() } : item
        )
      );
    } catch (err) {
      console.error('Error toggling item:', err);
      setError(err instanceof Error ? err.message : 'Failed to update item');
      // Refresh to revert optimistic update
      await fetchList();
    }
  };

  // Handle editing item text
  const handleEditItem = async (itemId: string, text: string) => {
    try {
      const response = await fetch(`/api/lists/${list.shareId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update item');
      }

      // Optimistically update UI
      setItems(prevItems =>
        prevItems.map(item =>
          item._id === itemId ? { ...item, text, updatedAt: new Date().toISOString() } : item
        )
      );
    } catch (err) {
      console.error('Error editing item:', err);
      setError(err instanceof Error ? err.message : 'Failed to update item');
      // Refresh to revert optimistic update
      await fetchList();
    }
  };

  // Handle deleting an item
  const handleDeleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/lists/${list.shareId}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete item');
      }

      // Optimistically update UI
      setItems(prevItems => prevItems.filter(item => item._id !== itemId));
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete item');
      // Refresh to revert optimistic update
      await fetchList();
    }
  };

  // Handle updating list title
  const handleUpdateTitle = async (title: string) => {
    try {
      const response = await fetch(`/api/lists/${list.shareId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update title');
      }

      const data = await response.json();
      setList(data.list);
    } catch (err) {
      console.error('Error updating title:', err);
      setError(err instanceof Error ? err.message : 'Failed to update title');
    }
  };

  // Handle deleting the list (owner only)
  const handleDeleteList = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/lists/${list.shareId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete list');
      }

      // Redirect to dashboard on success
      router.push('/dashboard');
    } catch (err) {
      console.error('Error deleting list:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete list');
      setShowDeleteConfirm(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to sign out');
      }

      // Redirect to landing page
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      {isOwner && userEmail && (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </button>
                <span className="text-sm text-gray-500">
                  {userEmail}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="py-8">
        <div className="max-w-2xl mx-auto px-4">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                {permission === 'edit' ? (
                  <EditListTitle
                    title={list.title}
                    onUpdate={handleUpdateTitle}
                  />
                ) : (
                  <h1 className="text-3xl font-bold text-gray-900">
                    {list.title}
                  </h1>
                )}
              </div>
              {/* Delete button - only show for owners */}
              {isOwner && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isLoading}
                  className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  title="Delete this list"
                >
                  Delete List
                </button>
              )}
            </div>
            <ShareLink shareId={list.shareId} viewId={list.viewId} />
          </div>

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
                    disabled={isLoading}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteList}
                    disabled={isLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {isLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Add item form - only show for edit permission */}
          {permission === 'edit' && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <AddItemForm
                onAdd={handleAddItem}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Items list */}
          <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
            {items.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No items yet.{permission === 'edit' ? ' Add your first task above!' : ''}
              </div>
            ) : (
              items.map(item => (
                <TodoItemComponent
                  key={item._id}
                  item={item}
                  onToggleComplete={handleToggleComplete}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                  permission={permission}
                />
              ))
            )}
          </div>

          {/* Item count */}
          <div className="mt-4 text-center text-sm text-gray-500">
            {items.length} {items.length === 1 ? 'item' : 'items'} •{' '}
            {items.filter(item => item.completed).length} completed
          </div>
        </div>
      </div>
    </div>
  );
}
