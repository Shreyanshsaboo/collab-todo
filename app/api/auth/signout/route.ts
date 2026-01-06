import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Mark this route as dynamic to prevent static optimization
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/signout
 * 
 * Signs out the current user by clearing the auth_token cookie
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Clear the auth token cookie
    cookieStore.delete('auth_token');
    
    return NextResponse.json(
      { message: 'Signed out successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { error: 'Failed to sign out' },
      { status: 500 }
    );
  }
}
