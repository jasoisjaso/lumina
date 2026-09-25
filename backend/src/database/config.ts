import type { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const databasePath = process.env.DATABASE_URL?.replace('sqlite://', '') || './data/lumina.db';

export const knexConfig: Knex.Config = {
  client: 'sqlite3',
  connection: {
    filename: databasePath,
  },
  migrations: {
    directory: './src/database/migrations',
    extension: 'ts',
  },
  pool: {
    afterCreate: (conn: any, cb: any) => {
      // WAL lets reads proceed during writes (background sync + API requests),
      // and busy_timeout waits for locks instead of failing with SQLITE_BUSY.
      conn.exec(
        'PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;',
        cb
      );
    },
  },
  useNullAsDefault: true,
};

export default knexConfig;
