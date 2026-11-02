import { randomUUID } from 'node:crypto';
import { expect } from 'chai';
import { gql, ops, errorCode, getToken, createGame, sampleGame } from '../helpers/graphql.js';

const remove = (id, user = 'leon') => gql(ops.remove, { id }, getToken(user));

describe('US-06 Delete game', () => {
  it('TC-06-01 deletes an owned game and returns it', async () => {
    const game = await createGame('leon', sampleGame());
    const res = await remove(game.id);

    expect(res.status).to.equal(200);
    expect(res.body.errors).to.equal(undefined);
    expect(res.body.data.deleteGame).to.deep.equal(game);
  });

  it('TC-06-02 deleted game is no longer retrievable', async () => {
    const game = await createGame('leon', sampleGame());
    await remove(game.id);
    const res = await gql(ops.get, { id: game.id }, getToken());

    expect(errorCode(res)).to.equal('NOT_FOUND');
  });

  it('TC-06-03 deleted game is removed from the list', async () => {
    const game = await createGame('leon', sampleGame());
    await remove(game.id);
    const res = await gql(ops.list, {}, getToken());

    expect(res.body.data.games.map((g) => g.id)).to.not.include(game.id);
  });

  it('TC-06-04 other games of the user are unaffected', async () => {
    const keep = await createGame('leon', sampleGame({ title: 'Keep' }));
    const drop = await createGame('leon', sampleGame({ title: 'Drop' }));
    await remove(drop.id);
    const res = await gql(ops.get, { id: keep.id }, getToken());

    expect(res.body.data.game).to.deep.equal(keep);
  });

  it('TC-06-05 non-existent id returns NOT_FOUND', async () => {
    const res = await remove(randomUUID());

    expect(res.status).to.equal(200);
    expect(errorCode(res)).to.equal('NOT_FOUND');
  });

  it('TC-06-06 deleting the same game twice returns NOT_FOUND the second time', async () => {
    const game = await createGame('leon', sampleGame());
    const first = await remove(game.id);
    const second = await remove(game.id);

    expect(first.body.errors).to.equal(undefined);
    expect(errorCode(second)).to.equal('NOT_FOUND');
  });

  it('TC-06-07 another user\'s game returns NOT_FOUND and is not deleted', async () => {
    const game = await createGame('kratos', sampleGame());
    const res = await remove(game.id, 'leon');
    const still = await gql(ops.get, { id: game.id }, getToken('kratos'));

    expect(errorCode(res)).to.equal('NOT_FOUND');
    expect(still.body.data.game).to.deep.equal(game);
  });

  it('TC-06-08 missing id argument is rejected (HTTP 400)', async () => {
    const res = await gql(`mutation { deleteGame { id } }`, undefined, getToken());

    expect(res.status).to.equal(400);
    expect(res.body.errors[0].extensions.code).to.equal('GRAPHQL_VALIDATION_FAILED');
  });
});
