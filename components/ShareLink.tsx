'use client';

import { useState } from 'react';

interface ShareLinkProps {
  shareId: string;
  viewId: string;
}

/**
 * ShareLink Component
 * 
 * Displays and allows copying both edit and view-only links for a todo list
 */
export function ShareLink({ shareId, viewId }: ShareLinkProps) {
  const [copiedEdit, setCopiedEdit] = useState(false);
  const [copiedView, setCopiedView] = useState(false);

  const editUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/list/${shareId}`
    : '';

  const viewUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/list/${viewId}`
    : '';

  const handleCopyEdit = async () => {
    try {
      await navigator.clipboard.writeText(editUrl);
      setCopiedEdit(true);
      setTimeout(() => setCopiedEdit(false), 2000);
    } catch (err) {
      console.error('Failed to copy edit link:', err);
    }
  };

  const handleCopyView = async () => {
    try {
      await navigator.clipboard.writeText(viewUrl);
      setCopiedView(true);
      setTimeout(() => setCopiedView(false), 2000);
    } catch (err) {
      console.error('Failed to copy view-only link:', err);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      {/* Edit Link */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900 mb-1">
              Edit Link
            </p>
            <code className="block text-sm text-blue-700 bg-white px-3 py-2 rounded border border-blue-200 truncate">
              {editUrl}
            </code>
          </div>
          <button
            onClick={handleCopyEdit}
            className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-medium"
          >
            {copiedEdit ? (
              <span className="flex items-center gap-2">
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied!
              </span>
            ) : (
              'Copy Link'
            )}
          </button>
        </div>
        <p className="text-xs text-blue-700 mt-2">
          Anyone with this link can view and edit this list
        </p>
      </div>

      {/* View-Only Link */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-900 mb-1">
              View-Only Link
            </p>
            <code className="block text-sm text-green-700 bg-white px-3 py-2 rounded border border-green-200 truncate">
              {viewUrl}
            </code>
          </div>
          <button
            onClick={handleCopyView}
            className="flex-shrink-0 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors font-medium"
          >
            {copiedView ? (
              <span className="flex items-center gap-2">
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied!
              </span>
            ) : (
              'Copy Link'
            )}
          </button>
        </div>
        <p className="text-xs text-green-700 mt-2">
          Anyone with this link can view this list but cannot edit
        </p>
      </div>
    </div>
  );
}
