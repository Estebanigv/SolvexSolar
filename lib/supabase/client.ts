import {createBrowserClient} from '@supabase/ssr';
import {supabaseUrl,supabaseKey} from './config';
export function browserDatabase(){return createBrowserClient(supabaseUrl,supabaseKey)}
