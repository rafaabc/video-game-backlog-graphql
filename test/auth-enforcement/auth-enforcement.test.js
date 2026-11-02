import { randomUUID } from 'node:crypto';
import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import {
  BASE_URL,
  USERS,
  gql,
  gqlRaw,
  ops,
  loadFixture,
  errorCode,
  getToken,
  createGame,
  sampleGame,
} from '../helpers/graphql.js';

const { badAuthorizationHeaders } = loadFixture('auth-enforcement');
const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

// Every operation except login, with valid variables.
const protectedOps = [
  { name: 'game', query: ops.get, variables: () => ({ id: randomUUID() }) },
  { name: 'games', query: ops.list, variables: () => ({}) },
  { name: 'createGame', query: ops.create, variables: () => ({ input: sampleGame() }) },
  { name: 'updateGame', query: ops.update, variables: () => ({ id: randomUUID(), input: { title: 'X' } }) },
  { name: 'deleteGame', query: ops.remove, variables: () => ({ id: randomUUID() }) },
];

const expiredToken = () =>
  jwt.sign({ sub: 'x', username: 'leon' }, SECRET, { expiresIn: -60 });
const wrongSignatureToken = () =>
  jwt.sign({ sub: 'x', username: 'leon' }, 'not-the-secret', { expiresIn: '1h' });

const rejectedCases = [
  ...badAuthorizationHeaders.map(({ description, header }) => ({
    description,
    header: header === null ? undefined : header,
  })),
  { description: 'expired token', header: `Bearer ${expiredToken()}` },
  { description: 'token with invalid signature', header: `Bearer ${wrongSignatureToken()}` },
];

describe('US-07 Authentication enforcement and error handling', () => {
  protectedOps.forEach(({ name, query, variables }) => {
    describe(name, () => {
      rejectedCases.forEach(({ description, header }) => {
        it(`TC-07-01..05 rejects ${description}`, async () => {
          const res = await gqlRaw(query, variables(), header);

          expect(res.status).to.equal(200);
          expect(errorCode(res)).to.equal('UNAUTHENTICATED');
          // TC-07-12: nothing leaks on failure
          expect(res.body.data === null || Object.values(res.body.data).every((v) => v === null)).to.equal(true);
        });
      });

      it('TC-07-02 rejects a valid token sent with a lowercase "bearer" scheme', async () => {
        const res = await gqlRaw(query, variables(), `bearer ${getToken()}`);

        expect(errorCode(res)).to.equal('UNAUTHENTICATED');
      });
    });
  });

  describe('request-level vs resolver-level errors', () => {
    it('TC-07-09 syntactically invalid query returns a parse error (HTTP 400)', async () => {
      const res = await gql('query { games { id ', undefined, getToken());

      expect(res.status).to.equal(400);
      expect(res.body.errors[0].extensions.code).to.equal('GRAPHQL_PARSE_FAILED');
    });

    it('TC-07-10 unknown query field is rejected (HTTP 400)', async () => {
      const res = await gql('query { unknownThing { id } }', undefined, getToken());

      expect(res.status).to.equal(400);
      expect(res.body.errors[0].extensions.code).to.equal('GRAPHQL_VALIDATION_FAILED');
    });

    it('TC-07-10 unknown mutation is rejected (HTTP 400)', async () => {
      const res = await gql('mutation { dropEverything { id } }', undefined, getToken());

      expect(res.status).to.equal(400);
      expect(res.body.errors[0].extensions.code).to.equal('GRAPHQL_VALIDATION_FAILED');
    });

    it('TC-07-14 error responses contain no stack trace', async () => {
      const res = await gql(ops.get, { id: randomUUID() }, getToken());

      expect(res.body.errors[0].extensions).to.not.have.property('stacktrace');
      expect(JSON.stringify(res.body)).to.not.include('stacktrace');
    });

    it('TC-07-16 request without a JSON body does not succeed', async () => {
      const res = await request(BASE_URL).post('/graphql').set('Content-Type', 'text/plain').send('hello');

      expect(res.status).to.be.at.least(400);
    });
  });

  describe('user isolation', () => {
    it('TC-07-11 each user only sees and modifies their own games', async () => {
      const owned = {};
      for (const username of Object.keys(USERS)) {
        owned[username] = await createGame(username, sampleGame({ title: `${username}'s game` }));
      }

      for (const username of Object.keys(USERS)) {
        const list = await gql(ops.list, {}, getToken(username));
        const listedIds = list.body.data.games.map((g) => g.id);

        for (const other of Object.keys(USERS)) {
          if (other === username) {
            expect(listedIds).to.include(owned[other].id);
          } else {
            expect(listedIds).to.not.include(owned[other].id);
            const get = await gql(ops.get, { id: owned[other].id }, getToken(username));
            expect(errorCode(get)).to.equal('NOT_FOUND');
          }
        }
      }
    });

    it('TC-07-11 full lifecycle: create, get, update, delete, get', async () => {
      const game = await createGame('leon', sampleGame({ title: 'Lifecycle' }));
      const token = getToken('leon');

      const got = await gql(ops.get, { id: game.id }, token);
      const updated = await gql(ops.update, { id: game.id, input: { status: 'FINISHED' } }, token);
      const deleted = await gql(ops.remove, { id: game.id }, token);
      const gone = await gql(ops.get, { id: game.id }, token);

      expect(got.body.data.game).to.deep.equal(game);
      expect(updated.body.data.updateGame.status).to.equal('FINISHED');
      expect(deleted.body.data.deleteGame.id).to.equal(game.id);
      expect(errorCode(gone)).to.equal('NOT_FOUND');
    });
  });
});
