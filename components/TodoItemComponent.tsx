'use client';

import { useState } from 'react';
import { TodoItem, Permission } from '@/lib/db-types';

interface TodoItemComponentProps {
  item: TodoItem;
  onToggleComplete: (itemId: string, completed: boolean) => void;
  onEdit: (itemId: string, text: string) => void;
  onDelete: (itemId: string) => void;
  permission: Permission;
}

/**
 * TodoItemComponent
 * 
 * Displays a single todo item with inline editing, completion toggle, and delete
 */
export function TodoItemComponent({
  item,
  onToggleComplete,
  onEdit,
  onDelete,
  permission,
}: TodoItemComponentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);

  const handleSave = () => {
    const trimmedText = editText.trim();
    if (trimmedText && trimmedText !== item.text) {
      onEdit(item._id, trimmedText);
    } else if (!trimmedText) {
      // Reset to original text if empty
      setEditText(item.text);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(item.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-3 group">
      {/* Checkbox - read-only for view permission */}
      <input
        type="checkbox"
        checked={item.completed}
        onChange={(e) => permission === 'edit' && onToggleComplete(item._id, e.target.checked)}
        disabled={permission === 'view'}
        className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={`Mark "${item.text}" as ${item.completed ? 'incomplete' : 'complete'}`}
      />

      {/* Text content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              maxLength={500}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p
              className={`text-gray-900 break-words ${
                item.completed ? 'line-through text-gray-500' : ''
              }`}
              onDoubleClick={() => permission === 'edit' && setIsEditing(true)}
            >
              {item.text}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {item.completed && '✓ '}
              {new Date(item.updatedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
        )}
      </div>

      {/* Actions - only show for edit permission */}
      {!isEditing && permission === 'edit' && (
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            aria-label="Edit item"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this item?')) {
                onDelete(item._id);
              }
            }}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            aria-label="Delete item"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
