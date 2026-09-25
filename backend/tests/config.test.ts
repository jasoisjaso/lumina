import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

async function loadSecret(env: Record<string, string | undefined>): Promise<string> {
  vi.resetModules();
  process.env = { ...originalEnv, ...env };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
  }
  const { config } = await import('../src/config');
  return config.jwtSecret;
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('JWT secret', () => {
  it('uses JWT_SECRET when set to a real value', async () => {
    expect(await loadSecret({ JWT_SECRET: 'a'.repeat(40) })).toBe('a'.repeat(40));
  });

  it('generates, persists and reuses a secret instead of the placeholder', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumina-secret-'));
    const env = { JWT_SECRET: 'your-secret-key-change-in-production', DATABASE_URL: `sqlite://${dir}/lumina.db` };
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const first = await loadSecret(env);
    const second = await loadSecret({ ...env, JWT_SECRET: undefined });

    expect(first).not.toBe('your-secret-key-change-in-production');
    expect(first.length).toBeGreaterThanOrEqual(64);
    expect(second).toBe(first);
    expect(fs.readFileSync(path.join(dir, '.jwt_secret'), 'utf8')).toBe(first);
  });
});
