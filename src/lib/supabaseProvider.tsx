'use client';

import { useSession } from '@clerk/nextjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import React, { createContext, useEffect, useState } from 'react';

type SupabaseContext = {
  supabase: SupabaseClient | null;
  isLoaded: boolean;
};

const Context = createContext<SupabaseContext>({
  supabase: null,
  isLoaded: false
});

export const SupabaseProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const { session } = useSession();
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!session) return;

      const token = await session.getToken({ template: 'supabase' });

      const client = createClient(
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

      setSupabase(client);
      setIsLoaded(true);
    };

    init();
  }, [session]);

  return (
    <Context.Provider value={{ supabase, isLoaded }}>
      {!isLoaded ? (
        <div className='flex h-screen items-center justify-center'>
          <Loader2 className='h-10 w-10 animate-spin' />
        </div>
      ) : (
        children
      )}
    </Context.Provider>
  );
};

export default SupabaseProvider;
