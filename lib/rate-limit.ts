/**
 * In-memory rate limiting for authentication endpoints
 * Note: This is a simple implementation for v1. For production with multiple
 * instances, consider using Redis or a distributed rate limiting solution.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // Timestamp in milliseconds
}

// Rate limit stores: IP-based for signup, email-based for signin
const signupAttempts = new Map<string, RateLimitEntry>();
const signinAttempts = new Map<string, RateLimitEntry>();

/**
 * Check if signup rate limit is exceeded for an IP address
 * Limit: 3 attempts per hour per IP
 * @param ip - IP address to check
 * @returns true if request is allowed, false if rate limit exceeded
 */
export function checkSignupRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = signupAttempts.get(ip);
  
  // Reset if expired
  if (entry && entry.resetAt < now) {
    signupAttempts.delete(ip);
  }
  
  // Check limit
  const current = signupAttempts.get(ip);
  if (current && current.count >= 3) {
    return false; // Rate limit exceeded
  }
  
  // Increment counter
  signupAttempts.set(ip, {
    count: (current?.count || 0) + 1,
    resetAt: current?.resetAt || now + 60 * 60 * 1000, // 1 hour
  });
  
  return true;
}

/**
 * Check if signin rate limit is exceeded for an email address
 * Limit: 5 attempts per 15 minutes per email
 * @param email - Email address to check (normalized to lowercase)
 * @returns true if request is allowed, false if rate limit exceeded
 */
export function checkSigninRateLimit(email: string): boolean {
  const now = Date.now();
  const normalizedEmail = email.toLowerCase().trim();
  const entry = signinAttempts.get(normalizedEmail);
  
  // Reset if expired
  if (entry && entry.resetAt < now) {
    signinAttempts.delete(normalizedEmail);
  }
  
  // Check limit
  const current = signinAttempts.get(normalizedEmail);
  if (current && current.count >= 5) {
    return false; // Rate limit exceeded
  }
  
  // Increment counter
  signinAttempts.set(normalizedEmail, {
    count: (current?.count || 0) + 1,
    resetAt: current?.resetAt || now + 15 * 60 * 1000, // 15 minutes
  });
  
  return true;
}

/**
 * Cleanup expired rate limit entries periodically
 * Runs every 5 minutes to prevent memory leaks
 */
setInterval(() => {
  const now = Date.now();
  
  // Cleanup expired signup attempts
  for (const [key, value] of signupAttempts.entries()) {
    if (value.resetAt < now) {
      signupAttempts.delete(key);
    }
  }
  
  // Cleanup expired signin attempts
  for (const [key, value] of signinAttempts.entries()) {
    if (value.resetAt < now) {
      signinAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000); // 5 minutes
