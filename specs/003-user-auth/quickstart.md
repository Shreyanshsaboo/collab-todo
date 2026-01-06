# Quickstart: Authentication & Authorization

**Feature**: 003-user-auth  
**Date**: 2026-01-06  
**Status**: Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the authentication and authorization system. Follow these steps to add user accounts, list ownership, and secure authorization to the collaborative to-do application.

---

## Prerequisites

Before starting implementation, ensure you have:

- [x] Reviewed [spec.md](spec.md) - Feature specification
- [x] Reviewed [plan.md](plan.md) - Implementation plan with constitution alignment
- [x] Reviewed [research.md](research.md) - Technical decisions (bcrypt, JWT, etc.)
- [x] Reviewed [data-model.md](data-model.md) - Database schema changes
- [x] Reviewed [contracts/auth-api.openapi.yaml](contracts/auth-api.openapi.yaml) - API specification
- [ ] MongoDB 8+ installed and running
- [ ] Node.js 18+ and npm installed
- [ ] Existing codebase (001-collab-todo-link and 002-view-only-links) working

---

## Phase 0: Environment Setup

### Step 1: Install Dependencies

```bash
# Install bcrypt for password hashing
npm install bcrypt
npm install --save-dev @types/bcrypt

# Install jsonwebtoken for JWT handling
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken

# Optional: Email validation library (or use regex)
npm install validator
npm install --save-dev @types/validator
```

**Verification**:
```bash
npm list bcrypt jsonwebtoken
# Should show both packages installed
```

### Step 2: Generate JWT Secret

```bash
# Generate a cryptographically secure secret (256 bits minimum)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output to .env.local
```

**Add to `.env.local`**:
```bash
JWT_SECRET=<paste_generated_secret_here>
JWT_EXPIRATION=24h
```

**Security Note**: Never commit JWT_SECRET to version control. Add to `.gitignore` if not already present.

### Step 3: Database Indexes

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/collabtodo

# Create users collection and indexes
db.createCollection("users");
db.users.createIndex(
  { email: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
    name: "unique_email_case_insensitive"
  }
);

# Add userId index to todolists collection
db.todolists.createIndex(
  { userId: 1 },
  { name: "owner_lists_lookup" }
);

# Verify indexes
db.users.getIndexes();
db.todolists.getIndexes();
```

---

## Phase 1: Data Layer

### Step 1: Update Type Definitions

**File**: `lib/db-types.ts`

Add User and Session interfaces:

```typescript
// NEW: User document in MongoDB
export interface UserDocument {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

// UPDATED: TodoList document (add userId field)
export interface TodoListDocument {
  _id: ObjectId;
  userId?: ObjectId;  // NEW: Optional for backward compatibility
  shareId: string;
  viewId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

// API types (serialized for responses)
export interface UserAPI {
  _id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  // passwordHash never exposed in API
}
```

### Step 2: Create Auth Utility Library

**File**: `lib/auth.ts`

```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserDocument } from './db-types';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';
const BCRYPT_ROUNDS = 12;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Hash password with bcrypt
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Verify password (constant-time comparison)
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(user: UserDocument): string {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRATION,
    }
  );
}

// Verify JWT token
export function verifyToken(token: string): {
  userId: string;
  email: string;
} {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
    };
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Serialize User document for API response (exclude passwordHash)
export function serializeUser(user: UserDocument): UserAPI {
  return {
    _id: user._id.toString(),
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
```

---

## Phase 2: Authentication Middleware

### Step 1: Create Auth Middleware

**File**: `lib/middleware/auth.ts`

```typescript
import { NextRequest } from 'next/server';
import { verifyToken } from '../auth';

export interface AuthContext {
  userId: string;
  email: string;
}

// Extract and verify JWT from cookie
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

// Require authentication (throws if not authenticated)
export function requireAuth(req: NextRequest): AuthContext {
  const auth = getAuthContext(req);
  
  if (!auth) {
    throw new Error('Authentication required');
  }
  
  return auth;
}

// Check if user is owner of list
export async function checkOwnership(
  userId: string,
  listId: string
): Promise<boolean> {
  const { getDatabase } = await import('../mongodb');
  const db = await getDatabase();
  const { ObjectId } = await import('mongodb');
  
  const list = await db.collection('todolists').findOne({
    _id: new ObjectId(listId),
  });
  
  if (!list || !list.userId) {
    return false;
  }
  
  return list.userId.toString() === userId;
}
```

### Step 2: Rate Limiting Utility

**File**: `lib/rate-limit.ts`

```typescript
// In-memory rate limiting (simple implementation for v1)
const signupAttempts = new Map<string, { count: number; resetAt: number }>();
const signinAttempts = new Map<string, { count: number; resetAt: number }>();

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

export function checkSigninRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = signinAttempts.get(email);
  
  if (entry && entry.resetAt < now) {
    signinAttempts.delete(email);
  }
  
  const current = signinAttempts.get(email);
  if (current && current.count >= 5) {
    return false;
  }
  
  signinAttempts.set(email, {
    count: (current?.count || 0) + 1,
    resetAt: current?.resetAt || now + 15 * 60 * 1000, // 15 minutes
  });
  
  return true;
}

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of signupAttempts.entries()) {
    if (value.resetAt < now) {
      signupAttempts.delete(key);
    }
  }
  for (const [key, value] of signinAttempts.entries()) {
    if (value.resetAt < now) {
      signinAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000); // Cleanup every 5 minutes
```

---

## Phase 3: API Routes

### Step 1: Signup Endpoint

**File**: `app/api/auth/signup/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { hashPassword, generateToken, serializeUser } from '@/lib/auth';
import { checkSignupRateLimit } from '@/lib/rate-limit';
import validator from 'validator';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkSignupRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429 }
      );
    }
    
    const { email, password } = await req.json();
    
    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }
    
    if (!validator.isEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if email exists
    const existing = await db.collection('users').findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }
    
    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const now = new Date();
    
    const result = await db.collection('users').insertOne({
      email: normalizedEmail,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });
    
    const user = await db.collection('users').findOne({ _id: result.insertedId });
    if (!user) {
      throw new Error('User creation failed');
    }
    
    // Generate JWT
    const token = generateToken(user);
    
    // Set cookie and return user
    const response = NextResponse.json(
      { user: serializeUser(user) },
      { status: 201 }
    );
    
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Step 2: Signin Endpoint

**File**: `app/api/auth/signin/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyPassword, generateToken, serializeUser } from '@/lib/auth';
import { checkSigninRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Rate limiting
    if (!checkSigninRateLimit(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Too many signin attempts. Please try again later.' },
        { status: 429 }
      );
    }
    
    const db = await getDatabase();
    const user = await db.collection('users').findOne({ email: normalizedEmail });
    
    // Use same error message for security (prevent email enumeration)
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    const token = generateToken(user);
    
    const response = NextResponse.json({ user: serializeUser(user) });
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Step 3: Signout & Me Endpoints

Create `app/api/auth/signout/route.ts` and `app/api/auth/me/route.ts` following similar patterns.

---

## Phase 4: Update List Endpoints

### Update POST /api/lists (Create List)

Add authentication requirement and associate with userId:

```typescript
import { requireAuth } from '@/lib/middleware/auth';

export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const auth = requireAuth(req);
    
    const { title } = await req.json();
    // ... validation ...
    
    const db = await getDatabase();
    const { ObjectId } = await import('mongodb');
    
    const result = await db.collection('todolists').insertOne({
      userId: new ObjectId(auth.userId), // NEW: Associate with owner
      shareId: generateShareId(),
      viewId: generateViewId(),
      title,
      createdAt: now,
      updatedAt: now,
    });
    
    // ... rest of implementation
  } catch (error) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    // ... error handling
  }
}
```

### Update DELETE /api/lists/[shareId] (Owner Only)

```typescript
export async function DELETE(
  req: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const auth = requireAuth(req); // Must be authenticated
    
    const db = await getDatabase();
    const { ObjectId } = await import('mongodb');
    
    const list = await db.collection('todolists').findOne({ shareId: params.shareId });
    
    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }
    
    // Check ownership
    if (!list.userId || list.userId.toString() !== auth.userId) {
      return NextResponse.json(
        { error: 'Only the list owner can delete this list' },
        { status: 403 }
      );
    }
    
    // Delete list and all items
    await db.collection('todolists').deleteOne({ _id: list._id });
    await db.collection('todoitems').deleteMany({ listId: list._id });
    
    return NextResponse.json({ message: 'List deleted successfully' });
  } catch (error) {
    // ... error handling
  }
}
```

---

## Phase 5: UI Components

### Step 1: Signup Form

**File**: `components/SignupForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error);
        return;
      }
      
      router.push('/dashboard');
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}
      
      <div>
        <label htmlFor="email" className="block mb-1">Email</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      
      <div>
        <label htmlFor="password" className="block mb-1">Password</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full px-3 py-2 border rounded"
        />
        <p className="text-sm text-gray-600 mt-1">Minimum 8 characters</p>
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Creating account...' : 'Sign Up'}
      </button>
    </form>
  );
}
```

### Step 2: Dashboard Page

**File**: `app/dashboard/page.tsx`

```typescript
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function DashboardPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) {
    redirect('/signin');
  }
  
  try {
    const auth = verifyToken(token);
    const db = await getDatabase();
    
    const lists = await db
      .collection('todolists')
      .find({ userId: new ObjectId(auth.userId) })
      .sort({ updatedAt: -1 })
      .toArray();
    
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">My Lists</h1>
        
        {lists.length === 0 ? (
          <p>No lists yet. Create your first list!</p>
        ) : (
          <div className="grid gap-4">
            {lists.map((list) => (
              <a
                key={list._id.toString()}
                href={`/list/${list.shareId}`}
                className="p-4 border rounded hover:bg-gray-50"
              >
                <h2 className="font-semibold">{list.title}</h2>
                <p className="text-sm text-gray-600">
                  Created {list.createdAt.toLocaleDateString()}
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    redirect('/signin');
  }
}
```

---

## Phase 6: Testing

### Manual Testing Checklist

- [ ] **Signup**: Create account with valid email/password → redirects to dashboard
- [ ] **Signup validation**: Try short password → error message
- [ ] **Signup duplicate**: Try same email twice → error "Email already registered"
- [ ] **Signin**: Sign in with valid credentials → redirects to dashboard
- [ ] **Signin invalid**: Try wrong password → error "Invalid credentials"
- [ ] **Dashboard**: View owned lists → displays user's lists
- [ ] **Create list**: Create new list while authenticated → list has userId
- [ ] **Owner delete**: Delete owned list → succeeds
- [ ] **Non-owner delete**: Try to delete someone else's list → 403 Forbidden
- [ ] **Link access**: Access list via shareId without auth → can edit
- [ ] **View link**: Access list via viewId → can view, cannot edit (403 on write)
- [ ] **Signout**: Sign out → cookie cleared, redirected to landing

---

## Troubleshooting

### Issue: "JWT_SECRET is required"
**Solution**: Add `JWT_SECRET` to `.env.local` (see Phase 0, Step 2)

### Issue: Duplicate email error even with different casing
**Solution**: Verify case-insensitive index on users.email (see Phase 0, Step 3)

### Issue: Authentication works locally but not in production
**Solution**: Ensure `secure: true` for cookies in production, HTTPS configured

### Issue: Rate limiting not working across serverless instances
**Expected**: In-memory rate limiting is per-instance. Upgrade to Redis if needed (deferred to v2).

---

## Next Steps

After completing implementation:

1. Run `/speckit.tasks` to generate detailed task breakdown by user story
2. Follow task list for incremental implementation
3. Test each user story independently (per spec acceptance criteria)
4. Update architecture.md with authentication layer documentation
5. Deploy to production with HTTPS configured

---

## References

- [Specification](spec.md) - Full feature requirements
- [Implementation Plan](plan.md) - Constitution alignment
- [Research](research.md) - Technical decisions
- [Data Model](data-model.md) - Database schema
- [API Contracts](contracts/auth-api.openapi.yaml) - OpenAPI specification
- Constitution v3.0.0 - Authentication principles
