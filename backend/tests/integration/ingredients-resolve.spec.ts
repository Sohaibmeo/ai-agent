import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

jest.setTimeout(15000);

describe('Ingredients resolve (fuzzy)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns fuzzy matches and resolved when confident', async () => {
    const res = await request(app.getHttpServer())
      .post('/ingredients/resolve')
      .send({ query: 'banan', createIfMissing: false, limit: 3, minScore: 0 })
      .expect(201);
    expect(res.body.matches?.length).toBeGreaterThan(0);
    // Should resolve to Banana (seeded)
    expect(res.body.resolved?.name?.toLowerCase()).toContain('banana');
  });
});
