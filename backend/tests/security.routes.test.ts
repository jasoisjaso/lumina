import express from 'express';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import authRoutes from '../src/routes/auth.routes';
import photoRoutes from '../src/routes/photo-gallery.routes';
import settingsRoutes from '../src/routes/settings.routes';
import { settingsService } from '../src/services/settings.service';
import { createFamily, createUser, db, migrate, tokenFor } from './helpers';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/settings', settingsRoutes);
app.use('/photos', photoRoutes);

let familyA: number;
let familyB: number;
let adminToken: string;
let memberToken: string;
let memberId: number;

beforeAll(async () => {
  await migrate();
  familyA = await createFamily('Family A');
  familyB = await createFamily('Family B');
  await createUser(familyA, 'admin@example.com', 'admin');
  memberId = await createUser(familyA, 'member@example.com', 'member');
  adminToken = await tokenFor('admin@example.com');
  memberToken = await tokenFor('member@example.com');

  await settingsService.updateSettings(familyA, 'integrations', {
    woocommerce: { enabled: true, storeUrl: 'https://shop.example', consumerKey: 'ck_live', consumerSecret: 'cs_live' },
  });
});

afterAll(async () => {
  await db.destroy();
});

describe('POST /auth/register', () => {
  const newUser = { email: 'new@example.com', password: 'Password123', first_name: 'New', last_name: 'User' };

  it('rejects anonymous requests', async () => {
    const res = await request(app).post('/auth/register').send({ ...newUser, family_id: familyA, role: 'admin' });

    expect(res.status).toBe(401);
  });

  it('rejects members', async () => {
    const res = await request(app).post('/auth/register').set('Authorization', `Bearer ${memberToken}`).send(newUser);

    expect(res.status).toBe(403);
  });

  it("creates the user in the admin's own family, ignoring family_id", async () => {
    const res = await request(app)
      .post('/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...newUser, family_id: familyB });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ family_id: familyA, role: 'member' });
  });

  it('rejects unknown roles', async () => {
    const res = await request(app)
      .post('/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...newUser, email: 'other@example.com', role: 'owner' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /auth/me', () => {
  it('only changes profile fields', async () => {
    const res = await request(app)
      .put('/auth/me')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ first_name: 'Renamed', role: 'admin', family_id: familyB, status: 'disabled' });

    expect(res.status).toBe(200);
    const user = await db('users').where({ id: memberId }).first();
    expect(user).toMatchObject({ first_name: 'Renamed', role: 'member', family_id: familyA, status: 'active' });
  });
});

describe('GET /settings', () => {
  it('blanks integration secrets for members', async () => {
    const res = await request(app).get('/settings/integrations').set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.settings.woocommerce).toMatchObject({ storeUrl: 'https://shop.example', consumerKey: '', consumerSecret: '' });

    const all = await request(app).get('/settings').set('Authorization', `Bearer ${memberToken}`);
    expect(all.body.settings.integrations.woocommerce.consumerSecret).toBe('');
  });

  it('returns secrets to admins', async () => {
    const res = await request(app).get('/settings/integrations').set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.settings.woocommerce.consumerSecret).toBe('cs_live');
  });
});

describe('GET /photos/serve', () => {
  const uploads = path.join(process.cwd(), 'data', 'uploads', 'photos');
  const ownPhoto = path.join(uploads, String(1), 'originals', 'vitest-own.jpg');
  const otherPhoto = path.join(uploads, String(2), 'originals', 'vitest-other.jpg');

  beforeAll(() => {
    expect([familyA, familyB]).toEqual([1, 2]);
    for (const file of [ownPhoto, otherPhoto]) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, 'jpeg');
    }
  });

  afterAll(() => {
    fs.rmSync(ownPhoto, { force: true });
    fs.rmSync(otherPhoto, { force: true });
  });

  it('serves own family photos with a private cache header', async () => {
    const res = await request(app).get('/photos/serve/1/originals/vitest-own.jpg').set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('private, max-age=31536000');
  });

  it.each([
    '/photos/serve/1%2F..%2F2/originals/vitest-other.jpg',
    '/photos/serve/2/originals/vitest-other.jpg',
    '/photos/serve/1/originals/..%2F..%2F2%2Foriginals%2Fvitest-other.jpg',
  ])('blocks access to another family: %s', async (url) => {
    const res = await request(app).get(url).set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
  });
});
