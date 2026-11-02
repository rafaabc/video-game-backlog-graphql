import { expect } from 'chai';
import { gql, ops, loadFixture, errorCode, getToken, createGame, sampleGame } from '../helpers/graphql.js';

const fx = loadFixture('list-games');
const list = (variables = {}, user = 'leon') => gql(ops.list, variables, getToken(user));
const ids = (res) => res.body.data.games.map((g) => g.id);

describe('US-04 List and filter games', () => {
  it('TC-04-01 returns an empty list when the user has no games', async () => {
    // `link` is not used to leave games behind; assumes a fresh localhost store.
    const res = await list({}, 'link');

    expect(res.status).to.equal(200);
    expect(res.body.data.games).to.deep.equal([]);
  });

  it('TC-04-02 returns all of the caller\'s games without filters', async () => {
    const created = [];
    for (const g of fx.seed) created.push(await createGame('leon', g));
    const res = await list();

    expect(ids(res)).to.include.members(created.map((g) => g.id));
  });

  it('TC-04-03 excludes other users\' games', async () => {
    const mine = await createGame('leon', sampleGame());
    const theirs = await createGame('kratos', sampleGame());
    const res = await list({}, 'leon');

    expect(ids(res)).to.include(mine.id);
    expect(ids(res)).to.not.include(theirs.id);
  });

  describe('filters', () => {
    fx.filters.forEach(({ description, filter }) => {
      it(`TC-04-04..07 filter by ${description}`, async () => {
        const created = [];
        for (const g of fx.seed) created.push(await createGame('leon', g));
        const matches = (g) =>
          (!filter.status || g.status === filter.status) && (!filter.platform || g.platform === filter.platform);

        const res = await list(filter);
        const returned = res.body.data.games;

        expect(res.status).to.equal(200);
        expect(returned.every(matches)).to.equal(true);
        expect(ids(res)).to.include.members(created.filter(matches).map((g) => g.id));
        expect(ids(res)).to.not.include.members(created.filter((g) => !matches(g)).map((g) => g.id));
      });
    });

    it('TC-04-07 filter with no matches returns an empty list, not an error', async () => {
      await createGame('link', sampleGame({ platform: 'PC', status: 'PLAYING' }));
      const res = await list({ status: 'WISHLIST' }, 'link');

      expect(res.status).to.equal(200);
      expect(res.body.errors).to.equal(undefined);
      expect(res.body.data.games).to.deep.equal([]);
    });

    it('TC-04-09 null filters behave as no filter', async () => {
      const game = await createGame('leon', sampleGame());
      const res = await list({ status: null, platform: null });

      expect(res.status).to.equal(200);
      expect(ids(res)).to.include(game.id);
    });

    fx.invalidFilters.forEach(({ description, variables }) => {
      it(`TC-04-08 rejects ${description} (HTTP 400)`, async () => {
        const res = await list(variables);

        expect(res.status).to.equal(400);
        expect(res.body.errors).to.be.an('array').that.is.not.empty;
      });
    });
  });

  it('TC-04-12 order is consistent across calls', async () => {
    for (const g of fx.seed) await createGame('leon', g);
    const first = ids(await list());
    const second = ids(await list());

    expect(second).to.deep.equal(first);
  });
});
