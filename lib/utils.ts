import { randomBytes } from 'crypto';
import type { TodoListDocument, Permission } from './db-types';

// ============================================================================
// Utility Functions for Collab-Todo
// ============================================================================

/**
 * Generate a cryptographically random 9-character shareId
 * Uses lowercase alphanumeric characters (a-z, 0-9) for URL friendliness
 * 
 * @returns string 9-character shareId (e.g., "k3mf8qp2x")
 * 
 * @example
 * const shareId = generateShareId(); // "k3mf8qp2x"
 */
export function generateShareId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const length = 9;
  
  // Generate random bytes (need more bytes than output length for uniform distribution)
  const randomBytesBuffer = randomBytes(length * 2);
  
  let result = '';
  for (let i = 0; i < length; i++) {
    // Use modulo to map byte value to charset index
    const byte = randomBytesBuffer[i];
    result += chars[byte % chars.length];
  }
  
  return result;
}

/**
 * Validate shareId or viewId format
 * Ensures ID is exactly 9 characters and contains only lowercase alphanumeric
 * Can be used to validate both shareId (edit permission) and viewId (view permission)
 * 
 * @param id The shareId or viewId to validate
 * @returns boolean true if valid, false otherwise
 * 
 * @example
 * isValidShareId('k3mf8qp2x'); // true
 * isValidShareId('K3MF8QP2X'); // false (uppercase)
 * isValidShareId('abc123');     // false (too short)
 */
export function isValidShareId(id: string): boolean {
  return /^[a-z0-9]{9}$/.test(id);
}

/**
 * Format a date to a human-readable string
 * Used for displaying createdAt/updatedAt timestamps
 * 
 * @param date Date object or ISO string to format
 * @returns string Formatted date string
 * 
 * @example
 * formatDate(new Date()); // "Jan 15, 2025 at 3:45 PM"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Debounce a function to limit how often it can be called
 * Useful for rate-limiting API calls or expensive operations
 * 
 * @param func The function to debounce
 * @param wait The number of milliseconds to wait
 * @returns Debounced function
 * 
 * @example
 * const saveChanges = debounce(() => fetch('/api/save'), 1000);
 * // Rapid calls will only execute once after 1 second of inactivity
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Safely parse JSON with error handling
 * Returns null if parsing fails instead of throwing
 * 
 * @param json JSON string to parse
 * @returns Parsed object or null if parsing fails
 */
export function safeJsonParse<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Generate a short error message from an unknown error
 * Useful for displaying user-friendly error messages
 * 
 * @param error Unknown error object
 * @returns string Error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Sleep for a specified duration (useful for testing and delays)
 * 
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clamp a number between min and max values
 * 
 * @param value The value to clamp
 * @param min Minimum value
 * @param max Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Detect permission level based on which ID matches
 * 
 * @param list The TodoList document from database
 * @param id The ID from the URL (either shareId or viewId)
 * @returns Permission 'edit' if id matches shareId, 'view' if id matches viewId
 * 
 * @example
 * detectPermission(list, 'abc123xyz'); // 'edit' (if matches shareId)
 * detectPermission(list, 'def456uvw'); // 'view' (if matches viewId)
 */
export function detectPermission(list: TodoListDocument, id: string): Permission {
  return list.shareId === id ? 'edit' : 'view';
}
