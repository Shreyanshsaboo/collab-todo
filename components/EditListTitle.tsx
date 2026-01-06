'use client';

import { useState } from 'react';

interface EditListTitleProps {
  title: string;
  onUpdate: (title: string) => void;
}

/**
 * EditListTitle Component
 * 
 * Displays and allows inline editing of the list title
 */
export function EditListTitle({ title, onUpdate }: EditListTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);

  const handleSave = () => {
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle && trimmedTitle !== title) {
      onUpdate(trimmedTitle);
    } else if (!trimmedTitle) {
      // Reset to original title if empty
      setEditTitle(title);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(title);
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
    <div>
      {isEditing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="text-3xl font-bold text-gray-900 w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none"
            autoFocus
            maxLength={200}
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
        <h1
          className="text-3xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => setIsEditing(true)}
          title="Click to edit title"
        >
          {title}
        </h1>
      )}
    </div>
  );
}
