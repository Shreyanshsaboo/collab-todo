import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyPassword, generateToken, serializeUser } from '@/lib/auth';
import { checkSigninRateLimit } from '@/lib/rate-limit';
import { UserDocument } from '@/lib/db-types';

// Mark this route as dynamic to prevent static optimization
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;
    
    // Validation: required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Rate limiting check (per email)
    if (!checkSigninRateLimit(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Too many signin attempts. Please try again later.' },
        { status: 429 }
      );
    }
    
    const db = await connectToDatabase();
    
    // Find user by email
    const user = await db.collection('users').findOne({ 
      email: normalizedEmail 
    }) as UserDocument | null;
    
    // Return same error message for both non-existent user and wrong password
    // This prevents email enumeration attacks
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Verify password (constant-time comparison via bcrypt)
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Create response with serialized user
    const response = NextResponse.json({ 
      user: serializeUser(user) 
    });
    
    // Set HTTP-only cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
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
