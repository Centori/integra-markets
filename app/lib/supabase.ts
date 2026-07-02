// Re-export of the canonical Supabase client from app/utils/supabaseConfig.
// The previous version of this file hardcoded a placeholder URL
// ("https://your-project.supabase.co") which is a foot-gun — if anything
// imported from here while the env vars were missing, the client would
// quietly try to talk to a non-existent project.
//
// Anything that needs `supabase` should import from '../utils/supabaseConfig'
// directly. This file exists only to keep legacy imports resolving.
export { supabase, supabaseUrl, supabaseAnonKey } from '../utils/supabaseConfig';
