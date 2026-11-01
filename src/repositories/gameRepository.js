import { randomUUID } from 'node:crypto';

let games = [];

export const gameRepository = {
  findAllByOwner(ownerId, { status, platform } = {}) {
    return games.filter(
      (g) =>
        g.ownerId === ownerId &&
        (status == null || g.status === status) &&
        (platform == null || g.platform === platform),
    );
  },

  findByIdAndOwner(id, ownerId) {
    return games.find((g) => g.id === id && g.ownerId === ownerId) ?? null;
  },

  create(ownerId, { title, platform, status }) {
    const game = { id: randomUUID(), ownerId, title, platform, status };
    games.push(game);
    return game;
  },

  update(game, changes) {
    Object.assign(game, changes);
    return game;
  },

  remove(game) {
    games = games.filter((g) => g.id !== game.id);
    return game;
  },

  reset() {
    games = [];
  },
};
