import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Runs before each test file is imported: point the app at a throwaway
// database so the real one is never touched.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumina-test-'));
process.env.DATABASE_URL = `sqlite://${path.join(dir, 'lumina.db')}`;
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';
