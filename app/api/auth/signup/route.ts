import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hashPassword, generateToken, serializeUser } from '@/lib/auth';
import { checkSignupRateLimit } from '@/lib/rate-limit';
import validator from 'validator';
import { UserDocument } from '@/lib/db-types';

// Mark this route as dynamic to prevent static optimization
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting check
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'unknown';
    
    if (!checkSignupRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429 }
      );
    }
    
    const body = await req.json();
    const { email, password } = body;
    
    // Validation: required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }
    
    // Validation: email format
    if (!validator.isEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Validation: password minimum length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }
    
    const db = await connectToDatabase();
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if email already exists
    const existing = await db.collection('users').findOne({ 
      email: normalizedEmail 
    });
    
    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    const now = new Date();
    
    // Create user
    const result = await db.collection('users').insertOne({
      email: normalizedEmail,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });
    
    // Fetch created user
    const user = await db.collection('users').findOne({ 
      _id: result.insertedId 
    }) as UserDocument | null;
    
    if (!user) {
      throw new Error('User creation failed');
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Create response with serialized user
    const response = NextResponse.json(
      { user: serializeUser(user) },
      { status: 201 }
    );
    
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
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
