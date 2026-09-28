// Public connection settings. This publishable key grants no access without RLS authorization.
// Never add a service_role or secret key to this file or to NEXT_PUBLIC_* variables.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oymuqllnmocfzmghbmcp.supabase.co';
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_2coc30rQ7-dKGMCz78W2Jg_dHsAWrBI';
export const usesSupabase = process.env.NEXT_PUBLIC_APP_RUNTIME !== 'sites';
