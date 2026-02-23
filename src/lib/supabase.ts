import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: any;

if (!supabaseUrl || !supabaseAnonKey) {
	console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. Supabase disabled.');
	supabase = {
		auth: {
			getSession: async () => ({ data: { session: null } }),
			onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
			signUp: async () => ({ error: new Error('Supabase not configured') }),
			signInWithPassword: async () => ({ error: new Error('Supabase not configured') }),
			signOut: async () => ({ error: new Error('Supabase not configured') }),
		},
	};
} else {
	supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };
