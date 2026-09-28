import { env } from 'cloudflare:workers';

export function database(): D1Database {
  if (!env.DB) throw new Error('Storage unavailable');
  return env.DB;
}
