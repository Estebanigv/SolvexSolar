import assert from 'node:assert/strict';

// Run against `npm run start` after `npm run build`. No real customer data.
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const page = await fetch(base);
assert.equal(page.status, 200);
const html = await page.text();
assert.match(html, /Demostración con precios ficticios/);
assert.match(html, /Prepara tu próxima propuesta/);
assert.ok(!html.includes('Iniciar sesión'));
assert.equal((await fetch(new URL('/logo.jpg', base))).status, 200);

// Sites gateway headers must not authenticate users on a public Next.js host.
for (const headers of [{}, {
  'oai-authenticated-user-id': 'forged-owner',
  'oai-authenticated-user-email': 'forged@example.test',
}]) {
  for (const [path, method] of [
    ['/api/workspace', 'GET'], ['/api/workspace', 'PUT'],
    ['/api/quotes', 'GET'], ['/api/quotes', 'POST'],
  ]) {
    const response = await fetch(new URL(path, base), {
      method, headers: { ...headers, Origin: base, 'Content-Type': 'application/json' },
      ...(method === 'GET' ? {} : { body: '{}' }),
    });
    assert.equal(response.status, 503, `${method} ${path}`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).code, 'PERSISTENCE_NOT_CONFIGURED');
  }
}
console.log('Next.js: página, recursos y bloqueo de acceso/guardado no configurado OK.');
