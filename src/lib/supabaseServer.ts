// lib/supabaseServer.ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

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

export const getUserSupabaseId = async ({ clerkId }: { clerkId: string }) => {
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_user_id', clerkId)
    .single();
  return userData.supabase_uid;
};
