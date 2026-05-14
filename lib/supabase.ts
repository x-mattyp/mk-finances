import { createBrowserClient } from "@supabase/auth-helpers-nextjs";

/**
 * Browser Supabase client (cookie-backed session for App Router + middleware).
 * Implemented with `@supabase/auth-helpers-nextjs` (same SSR cookie layer as `@supabase/ssr`).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Check .env.local and restart `npm run dev`.",
    );
  }
  if (url.includes("your-project-id") || key.includes("your-anon-key")) {
    throw new Error(
      "Supabase URL or anon key still looks like a placeholder. Replace them in .env.local with your project values from Supabase → Settings → API.",
    );
  }
  return createBrowserClient(url, key);
}
