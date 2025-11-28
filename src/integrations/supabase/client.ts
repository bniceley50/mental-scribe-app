import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

// Custom storage adapter to use sessionStorage (Security Requirement)
const sessionStorageAdapter = {
  getItem: (key: string) => {
    return sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    sessionStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: sessionStorageAdapter,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});