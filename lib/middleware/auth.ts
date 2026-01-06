import { NextRequest } from 'next/server';
import { verifyToken } from '../auth';
import { connectToDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';

/**
 * Authentication context extracted from JWT token
 */
export interface AuthContext {
  userId: string;
  email: string;
}

/**
 * Extract and verify authentication context from request cookies
 * @param req - Next.js request object
 * @returns AuthContext if authenticated, null otherwise
 */
export function getAuthContext(req: NextRequest): AuthContext | null {
  const token = req.cookies.get('auth_token')?.value;
  
  if (!token) {
    return null;
  }
  
  try {
    const decoded = verifyToken(token);
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Require authentication, throw error if not authenticated
 * Use this at the start of protected API routes
 * @param req - Next.js request object
 * @returns AuthContext with userId and email
 * @throws Error with message "Authentication required" if not authenticated
 */
export function requireAuth(req: NextRequest): AuthContext {
  const auth = getAuthContext(req);
  
  if (!auth) {
    throw new Error('Authentication required');
  }
  
  return auth;
}

/**
 * Check if the authenticated user is the owner of a list
 * @param userId - User ID from auth context
 * @param listId - ObjectId string or shareId of the list
 * @returns Promise resolving to true if user is owner, false otherwise
 */
export async function checkOwnership(
  userId: string,
  listId: string
): Promise<boolean> {
  const db = await connectToDatabase();
  
  // Try to find list by _id first (if listId is ObjectId string)
  let list;
  try {
    list = await db.collection('todolists').findOne({
      _id: new ObjectId(listId),
    });
  } catch (error) {
    // If not valid ObjectId, try finding by shareId
    list = await db.collection('todolists').findOne({
      shareId: listId,
    });
  }
  
  if (!list || !list.userId) {
    return false;
  }
  
  return list.userId.toString() === userId;
}
