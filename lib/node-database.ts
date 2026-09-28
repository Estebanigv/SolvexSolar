// Native Next.js has no Cloudflare binding. Fail closed until a persistent
// database and a verified identity provider have been integrated together.
export function database(): D1Database {
  throw new Error('Persistent storage is not configured for Next.js.');
}
