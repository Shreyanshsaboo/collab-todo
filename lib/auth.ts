import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserDocument, UserAPI } from './db-types';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Only throw in production/runtime, not during build
    if (process.env.NODE_ENV !== 'development' && typeof window === 'undefined') {
      console.warn('JWT_SECRET not set, using fallback for build time');
      return 'build-time-placeholder-do-not-use-in-production';
    }
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

function getJwtExpiration() {
  return process.env.JWT_EXPIRATION || '24h';
}

function getBcryptRounds() {
  return 12;
}

/**
 * Hash a plaintext password using bcrypt with cost factor 12
 * @param password - Plaintext password to hash
 * @returns Promise resolving to bcrypt hash string (60 characters)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, getBcryptRounds());
}

/**
 * Verify a plaintext password against a bcrypt hash
 * Uses constant-time comparison to prevent timing attacks
 * @param password - Plaintext password to verify
 * @param hash - bcrypt hash to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for an authenticated user
 * Token expires after JWT_EXPIRATION (default 24h)
 * @param user - User document from database
 * @returns JWT token string
 */
export function generateToken(user: UserDocument): string {
  const secret = getJwtSecret(); // Call at runtime, not module load time
  const token = jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
    },
    secret,
    {
      expiresIn: getJwtExpiration(),
    } as jwt.SignOptions
  );
  return token;
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token string
 * @returns Decoded token payload with userId and email
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): {
  userId: string;
  email: string;
} {
  try {
    const secret = getJwtSecret(); // Call at runtime, not module load time
    const decoded = jwt.verify(token, secret) as {
      userId: string;
      email: string;
    };
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Serialize a User document for API response
 * Excludes passwordHash for security
 * Converts ObjectId and Date to strings
 * @param user - User document from database
 * @returns User object safe for API response
 */
export function serializeUser(user: UserDocument): UserAPI {
  return {
    _id: user._id.toString(),
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
