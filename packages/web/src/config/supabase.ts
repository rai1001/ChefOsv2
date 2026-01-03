import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPA_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPA_KEY || '';

let client: SupabaseClient;

try {
  if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    throw new Error('Supabase URL is missing or invalid: ' + supabaseUrl);
  }
  client = createClient(supabaseUrl, supabaseAnonKey);
} catch (e) {
  console.warn('[Supabase Config] Failed to create client, using fallback:', e);
  // Return a dummy client to prevent crashes on import
  client = {
    from: (table: string) => {
      console.warn(`[Supabase Fallback] Called .from('${table}') but client is not configured.`);
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: null,
                error: { message: 'Supabase not configured', code: 'CONFIG_MISSING' },
              }),
            order: () =>
              Promise.resolve({
                data: [],
                error: { message: 'Supabase not configured', code: 'CONFIG_MISSING' },
              }),
          }),
          order: () =>
            Promise.resolve({
              data: [],
              error: { message: 'Supabase not configured', code: 'CONFIG_MISSING' },
            }),
        }),
      };
    },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  } as any;
}

export const supabase = client;

if (typeof window !== 'undefined') {
  console.log('[Supabase Config] Status:', {
    hasUrl: !!supabaseUrl,
    hasFrom: typeof (supabase as any)?.from === 'function',
    authReady: !!supabase?.auth,
  });
}
