import { expect } from 'chai';
import { gql, ops, loadFixture, errorCode, getToken, createGame, sampleGame } from '../helpers/graphql.js';

const fx = loadFixture('create-game');
const create = (input, user = 'leon') => gql(ops.create, { input }, getToken(user));

describe('US-02 Create game', () => {
  describe('happy path', () => {
    it('TC-02-01 creates a game and returns its fields', async () => {
      const input = sampleGame();
      const res = await create(input);
      const game = res.body.data.createGame;
      await gql(ops.remove, { id: game.id }, getToken());

      expect(res.status).to.equal(200);
      expect(res.body.errors).to.equal(undefined);
      expect(game).to.have.all.keys('id', 'title', 'platform', 'status');
      expect(game).to.include(input);
      expect(game.id).to.be.a('string').that.is.not.empty;
    });

    fx.platforms.forEach((platform) => {
      it(`TC-02-02 accepts platform ${platform}`, async () => {
        const game = await createGame('leon', sampleGame({ platform }));

        expect(game.platform).to.equal(platform);
      });
    });

    fx.statuses.forEach((status) => {
      it(`TC-02-03 accepts status ${status}`, async () => {
        const game = await createGame('leon', sampleGame({ status }));

        expect(game.status).to.equal(status);
      });
    });

    it('TC-02-04 each game gets a unique id', async () => {
      const a = await createGame('leon', sampleGame());
      const b = await createGame('leon', sampleGame());

      expect(a.id).to.not.equal(b.id);
    });

    it('TC-02-05 created game is retrievable and listed for its owner', async () => {
      const game = await createGame('leon', sampleGame({ title: 'Persisted' }));

      const got = await gql(ops.get, { id: game.id }, getToken());
      const list = await gql(ops.list, {}, getToken());

      expect(got.body.data.game).to.deep.equal(game);
      expect(list.body.data.games.map((g) => g.id)).to.include(game.id);
    });

    it('TC-02-12 duplicate titles are allowed', async () => {
      const a = await createGame('leon', sampleGame({ title: 'Twin' }));
      const b = await createGame('leon', sampleGame({ title: 'Twin' }));

      expect(a.id).to.not.equal(b.id);
      expect(b.title).to.equal('Twin');
    });

    it('TC-02-13 very long title is accepted (no max length)', async () => {
      const title = 'x'.repeat(5000);
      const game = await createGame('leon', sampleGame({ title }));

      expect(game.title).to.equal(title);
    });

    fx.titleCases.forEach(({ description, title, expected }) => {
      it(`TC-02-06/14 ${description}`, async () => {
        const game = await createGame('leon', sampleGame({ title }));

        expect(game.title).to.equal(expected);
      });
    });
  });

  describe('business rules', () => {
    fx.blankTitles.forEach(({ description, title }) => {
      it(`TC-02-07 rejects blank title (${description}) with BAD_USER_INPUT`, async () => {
        const res = await create(sampleGame({ title }));

        expect(res.status).to.equal(200);
        expect(errorCode(res)).to.equal('BAD_USER_INPUT');
        expect(res.body.data).to.equal(null);
      });
    });
  });

  describe('request-level validation (HTTP 400)', () => {
    fx.invalidInputs.forEach(({ description, input }) => {
      it(`TC-02-08..11 rejects ${description}`, async () => {
        const res = await create(input);

        expect(res.status).to.equal(400);
        expect(res.body.errors).to.be.an('array').that.is.not.empty;
        expect(res.body.data).to.equal(undefined);
      });
    });
  });

  describe('ownership and schema', () => {
    it('TC-02-16 ownerId is not selectable in the schema', async () => {
      const res = await gql(
        `mutation($input: CreateGameInput!) { createGame(input: $input) { id ownerId } }`,
        { input: sampleGame() },
        getToken(),
      );

      expect(res.status).to.equal(400);
      expect(res.body.errors[0].extensions.code).to.equal('GRAPHQL_VALIDATION_FAILED');
    });
  });
});
