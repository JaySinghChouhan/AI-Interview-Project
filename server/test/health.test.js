import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('health route returns a success response', async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'ok');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });

    test('AI routes report missing provider configuration instead of returning fake results', async () => {
      const previousKey = process.env.OPENROUTER_API_KEY;
      process.env.OPENROUTER_API_KEY = '';
      const app = createApp();
      const server = app.listen(0);

      try {
        await new Promise((resolve) => server.once('listening', resolve));
        const address = server.address();
        const response = await fetch(`http://127.0.0.1:${address.port}/api/ai/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'Frontend Developer',
            level: 'Mid-level',
            interviewType: 'Technical',
          }),
        });
        const body = await response.json();

        assert.equal(response.status, 503);
        assert.match(body.message, /OPENROUTER_API_KEY/);
      } finally {
        if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
        else process.env.OPENROUTER_API_KEY = previousKey;
        await new Promise((resolve, reject) => {
          server.close((error) => error ? reject(error) : resolve());
        });
      }
    });

    test('AI routes reject invalid interview input', async () => {
      const app = createApp();
      const server = app.listen(0);

      try {
        await new Promise((resolve) => server.once('listening', resolve));
        const address = server.address();
        const response = await fetch(`http://127.0.0.1:${address.port}/api/ai/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: '', level: 'Mid-level', interviewType: 'Technical' }),
        });

        assert.equal(response.status, 400);
      } finally {
        await new Promise((resolve, reject) => {
          server.close((error) => error ? reject(error) : resolve());
        });
      }
    });
  }
});
