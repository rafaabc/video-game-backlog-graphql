import { randomUUID } from 'node:crypto';
import { expect } from 'chai';
import { gql, ops, errorCode, getToken, createGame, sampleGame } from '../helpers/graphql.js';

const get = (id, user = 'leon') => gql(ops.get, { id }, getToken(user));

describe('US-03 Get game by id', () => {
  it('TC-03-01 returns an owned game with correct fields', async () => {
    const game = await createGame('leon', sampleGame({ title: 'Celeste', platform: 'PS5', status: 'FINISHED' }));
    const res = await get(game.id);

    expect(res.status).to.equal(200);
    expect(res.body.errors).to.equal(undefined);
    expect(res.body.data.game).to.deep.equal(game);
  });

  it('TC-03-02 returns only the requested fields', async () => {
    const game = await createGame('leon', sampleGame());
    const res = await gql(`query($id: ID!) { game(id: $id) { title } }`, { id: game.id }, getToken());

    expect(res.body.data.game).to.deep.equal({ title: game.title });
  });

  it('TC-03-03 non-existent id returns NOT_FOUND', async () => {
    const res = await get(randomUUID());

    expect(res.status).to.equal(200);
    expect(errorCode(res)).to.equal('NOT_FOUND');
    expect(res.body.data.game).to.equal(null);
  });

  it('TC-03-04 another user\'s game id returns NOT_FOUND', async () => {
    const game = await createGame('kratos', sampleGame());
    const res = await get(game.id, 'leon');

    expect(res.status).to.equal(200);
    expect(errorCode(res)).to.equal('NOT_FOUND');
    expect(res.body.data.game).to.equal(null);
  });

  it('TC-03-11 other-user and missing ids return identical errors (no ownership leak)', async () => {
    const game = await createGame('kratos', sampleGame());
    const other = await get(game.id, 'leon');
    const missing = await get(randomUUID(), 'leon');

    expect(other.body.errors[0].message).to.equal(missing.body.errors[0].message);
    expect(errorCode(other)).to.equal(errorCode(missing));
  });

  it('TC-03-07 missing id argument is rejected (HTTP 400)', async () => {
    const res = await gql(`query { game { id } }`, undefined, getToken());

    expect(res.status).to.equal(400);
    expect(res.body.errors[0].extensions.code).to.equal('GRAPHQL_VALIDATION_FAILED');
  });

  it('TC-03-08 id of the wrong type is rejected (HTTP 400)', async () => {
    const res = await gql(ops.get, { id: true }, getToken());

    expect(res.status).to.equal(400);
    expect(res.body.errors).to.be.an('array').that.is.not.empty;
  });

  it('TC-03-09 unknown field (ownerId) is rejected (HTTP 400)', async () => {
    const res = await gql(`query($id: ID!) { game(id: $id) { ownerId } }`, { id: randomUUID() }, getToken());

    expect(res.status).to.equal(400);
    expect(res.body.errors[0].extensions.code).to.equal('GRAPHQL_VALIDATION_FAILED');
  });
});
