import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const databaseFilename = process.env.DATABASE_URL?.replace('sqlite://', '') || './data/lumina.db';

// Placeholder values shipped in docs/examples that must never be used as a real secret
const PLACEHOLDER_JWT_SECRETS = new Set([
  'your-secret-key-change-in-production',
  'change-this-to-a-secure-random-string-minimum-32-characters',
]);

/**
 * Resolve the JWT signing secret.
 * Uses JWT_SECRET when it is set to a real value. Otherwise a random secret is
 * generated once and persisted next to the database, so self-hosted installs
 * are secure without extra configuration and sessions survive restarts.
 */
function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && !PLACEHOLDER_JWT_SECRETS.has(fromEnv)) {
    if (fromEnv.length < 32) {
      console.warn('JWT_SECRET is shorter than 32 characters; consider using a longer random value');
    }
    return fromEnv;
  }

  const secretFile = path.join(path.dirname(databaseFilename), '.jwt_secret');
  try {
    const existing = fs.readFileSync(secretFile, 'utf8').trim();
    if (existing.length >= 32) {
      return existing;
    }
  } catch {
    // No persisted secret yet
  }

  const generated = crypto.randomBytes(48).toString('hex');
  fs.mkdirSync(path.dirname(secretFile), { recursive: true });
  fs.writeFileSync(secretFile, generated, { mode: 0o600 });
  console.warn(`JWT_SECRET not set; generated a random secret and saved it to ${secretFile}`);
  return generated;
}

export const config = {
  port: process.env.PORT || 3001,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  database: {
    client: 'sqlite3',
    connection: {
      filename: databaseFilename,
    },
    useNullAsDefault: true,
  },
  jwtSecret: resolveJwtSecret(),
  woocommerce: {
    storeUrl: process.env.WC_STORE_URL,
    consumerKey: process.env.WC_CONSUMER_KEY,
    consumerSecret: process.env.WC_CONSUMER_SECRET,
  },
  sync: {
    intervalMinutes: parseInt(process.env.SYNC_INTERVAL || '30'),
    daysBack: parseInt(process.env.SYNC_DAYS_BACK || '30'),
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/calendar/callback',
  },
};

export default config;
