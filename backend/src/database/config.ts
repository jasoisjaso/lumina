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
      conn.run('PRAGMA foreign_keys = ON', cb);
    },
  },
  useNullAsDefault: true,
};

export default knexConfig;
