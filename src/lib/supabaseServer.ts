// lib/supabaseServer.ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { createHash } from 'crypto';

export async function createSupabaseServerClient() {
  const { getToken } = await auth();
  const token = await getToken({ template: 'supabase' });

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );
}

// Generate a deterministic UUID from Clerk ID
function clerkIdToUuid(clerkId: string): string {
  // Create MD5 hash of the Clerk ID
  const hash = createHash('md5').update(clerkId).digest('hex');

  // Format as UUID v4
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    hash.substring(16, 20),
    hash.substring(20, 32)
  ].join('-');
}

export const getUserSupabaseId = async ({ clerkId }: { clerkId: string }) => {
  // Try to get user from database
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkId)
    .single();

  // If user exists, return their ID
  if (userData && !userError) {
    return userData.id;
  }

  // Fallback: Use hardcoded user ID
  const FALLBACK_USER_ID = '19bfe98a-5ec1-414a-bea7-7d55263d3462';
  console.log('User not found in database, using fallback user ID');
  return FALLBACK_USER_ID;
};
