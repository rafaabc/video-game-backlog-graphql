import { randomUUID } from 'node:crypto';
import { expect } from 'chai';
import { gql, ops, loadFixture, errorCode, getToken, createGame, sampleGame } from '../helpers/graphql.js';

const fx = loadFixture('update-game');
const update = (id, input, user = 'leon') => gql(ops.update, { id, input }, getToken(user));
const fetchGame = async (id, user = 'leon') =>
  (await gql(ops.get, { id }, getToken(user))).body.data.game;

describe('US-05 Update game', () => {
  describe('successful updates', () => {
    fx.singleField.forEach(({ description, changes }) => {
      it(`TC-05-01..03 updates ${description} and leaves other fields`, async () => {
        const game = await createGame('leon', sampleGame());
        const res = await update(game.id, changes);

        expect(res.status).to.equal(200);
        expect(res.body.errors).to.equal(undefined);
        expect(res.body.data.updateGame).to.deep.equal({ ...game, ...changes });
        expect(await fetchGame(game.id)).to.deep.equal({ ...game, ...changes });
      });
    });

    it('TC-05-04 updates several fields at once', async () => {
      const game = await createGame('leon', sampleGame());
      const changes = { title: 'Both', platform: 'XBOX', status: 'FINISHED' };
      const res = await update(game.id, changes);

      expect(res.body.data.updateGame).to.deep.equal({ id: game.id, ...changes });
    });

    it('TC-05-05 trims the updated title', async () => {
      const game = await createGame('leon', sampleGame());
      const res = await update(game.id, { title: '  Trimmed  ' });

      expect(res.body.data.updateGame.title).to.equal('Trimmed');
    });
  });

  describe('business rules', () => {
    fx.blankTitles.forEach(({ description, title }) => {
      it(`TC-05-06 rejects blank title (${description}) and leaves game unchanged`, async () => {
        const game = await createGame('leon', sampleGame());
        const res = await update(game.id, { title });

        expect(res.status).to.equal(200);
        expect(errorCode(res)).to.equal('BAD_USER_INPUT');
        expect(await fetchGame(game.id)).to.deep.equal(game);
      });
    });

    it('TC-05-07 rejects an empty input object with BAD_USER_INPUT', async () => {
      const game = await createGame('leon', sampleGame());
      const res = await update(game.id, {});

      expect(res.status).to.equal(200);
      expect(errorCode(res)).to.equal('BAD_USER_INPUT');
    });

    fx.nullFields.forEach(({ description, input }) => {
      it(`TC-05-08 rejects ${description} with BAD_USER_INPUT`, async () => {
        const game = await createGame('leon', sampleGame());
        const res = await update(game.id, input);

        expect(res.status).to.equal(200);
        expect(errorCode(res)).to.equal('BAD_USER_INPUT');
        expect(await fetchGame(game.id)).to.deep.equal(game);
      });
    });
  });

  describe('not found and ownership', () => {
    it('TC-05-09 non-existent id returns NOT_FOUND', async () => {
      const res = await update(randomUUID(), { title: 'X' });

      expect(res.status).to.equal(200);
      expect(errorCode(res)).to.equal('NOT_FOUND');
    });

    it('TC-05-10 another user\'s game returns NOT_FOUND and stays unchanged', async () => {
      const game = await createGame('kratos', sampleGame());
      const res = await update(game.id, { title: 'Hijacked' }, 'leon');

      expect(errorCode(res)).to.equal('NOT_FOUND');
      expect(await fetchGame(game.id, 'kratos')).to.deep.equal(game);
    });

    it('TC-05-11 existence is checked before input validation', async () => {
      const res = await update(randomUUID(), {});

      expect(errorCode(res)).to.equal('NOT_FOUND');
    });
  });

  describe('request-level validation (HTTP 400)', () => {
    fx.invalidInputs.forEach(({ description, input }) => {
      it(`TC-05-12/13 rejects ${description}`, async () => {
        const game = await createGame('leon', sampleGame());
        const res = await update(game.id, input);

        expect(res.status).to.equal(400);
        expect(res.body.errors).to.be.an('array').that.is.not.empty;
        expect(await fetchGame(game.id)).to.deep.equal(game);
      });
    });
  });
});
