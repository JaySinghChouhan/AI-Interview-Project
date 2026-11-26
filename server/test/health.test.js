import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

async function startServer(app = createApp()) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
}

test('health route returns a success response', async () => {
  const server = await startServer();
  try {
    const response = await fetch(`${server.baseUrl}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'ok');
  } finally {
    await server.close();
  }
});

test('account and AI routes do not allow unauthenticated access', async () => {
  const server = await startServer();
  try {
    const [accountResponse, aiResponse] = await Promise.all([
      fetch(`${server.baseUrl}/api/auth/me`),
      fetch(`${server.baseUrl}/api/ai/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'Frontend Developer',
          level: 'Mid-level',
          interviewType: 'Technical',
        }),
      }),
    ]);

    assert.equal(accountResponse.status, 401);
    assert.equal(aiResponse.status, 401);
  } finally {
    await server.close();
  }
});

test('authentication rate limiting distinguishes Vercel forwarded client IPs', async () => {
  const previousVercelValue = process.env.VERCEL;
  process.env.VERCEL = '1';
  const app = createApp();
  if (previousVercelValue === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = previousVercelValue;
  const server = await startServer(app);

  async function loginFrom(ip) {
    return fetch(`${server.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': ip,
      },
      body: JSON.stringify({ email: 'invalid', password: 'short' }),
    });
  }

  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      assert.equal((await loginFrom('198.51.100.10')).status, 400);
    }

    assert.equal((await loginFrom('203.0.113.20')).status, 400);
    assert.equal((await loginFrom('198.51.100.10')).status, 429);
  } finally {
    await server.close();
  }
});

test('registration validates input before attempting database access', async () => {
  const server = await startServer();
  try {
    const response = await fetch(`${server.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A', email: 'not-an-email', password: 'short' }),
    });

    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /Name must be between/);
  } finally {
    await server.close();
  }
});

test('registration reports missing MongoDB configuration', { skip: Boolean(process.env.MONGODB_URI) }, async () => {
  const server = await startServer();
  try {
    const response = await fetch(`${server.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Candidate',
        email: 'candidate@example.com',
        password: 'secure-password',
      }),
    });

    assert.equal(response.status, 503);
    assert.match((await response.json()).message, /MONGODB_URI/);
  } finally {
    await server.close();
  }
});

test('logout clears the session cookie even if there is no session to revoke', async () => {
  const server = await startServer();
  try {
    const response = await fetch(`${server.baseUrl}/api/auth/logout`, { method: 'POST' });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /interview_session=.*Expires=Thu, 01 Jan 1970/);
  } finally {
    await server.close();
  }
});
