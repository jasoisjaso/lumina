import path from 'path';
import db from '../src/database/knex';
import authService from '../src/services/auth.service';

// Knex loads migration files with Node's require, which needs a TypeScript hook
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('ts-node').register({ transpileOnly: true });

export async function migrate(): Promise<void> {
  await db.migrate.latest({
    directory: path.join(__dirname, '../src/database/migrations'),
    loadExtensions: ['.ts'],
  });
}

function insertedId(row: unknown): number {
  return typeof row === 'object' && row !== null ? (row as { id: number }).id : (row as number);
}

export async function createFamily(name: string): Promise<number> {
  const [row] = await db('families').insert({ name }).returning('id');
  return insertedId(row);
}

export async function createUser(
  familyId: number,
  email: string,
  role: 'admin' | 'member' = 'member',
  password = 'Password123'
): Promise<number> {
  const [row] = await db('users')
    .insert({
      family_id: familyId,
      email,
      password_hash: await authService.hashPassword(password),
      first_name: 'Test',
      last_name: role === 'admin' ? 'Admin' : 'Member',
      role,
    })
    .returning('id');
  return insertedId(row);
}

export async function createOrder(familyId: number, wooCommerceId: number, status = 'processing'): Promise<number> {
  const [row] = await db('cached_orders')
    .insert({
      family_id: familyId,
      woocommerce_order_id: wooCommerceId,
      status,
      date_created: new Date(),
      customer_name: 'Customer',
      total: 10,
      raw_data: '{}',
      synced_at: new Date(),
    })
    .returning('id');
  return insertedId(row);
}

export async function tokenFor(email: string, password = 'Password123'): Promise<string> {
  const result = await authService.loginUser(email, password);
  return result.tokens.accessToken;
}

export { db };
