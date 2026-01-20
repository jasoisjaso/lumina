import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  database: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DATABASE_URL?.replace('sqlite://', '') || './data/lumina.db',
    },
    useNullAsDefault: true,
  },
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
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
