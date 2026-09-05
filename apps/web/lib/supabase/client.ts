import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client (uses the public anon key; RLS enforced). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
