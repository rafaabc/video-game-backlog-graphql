import { gameRepository } from '../repositories/gameRepository.js';
import { findByCredentials } from '../auth/users.js';
import { signToken } from '../auth/jwt.js';
import { badInput, notFound, unauthenticated } from '../errors/errors.js';

const requireUser = (ctx) => {
  if (!ctx.user) throw unauthenticated();
  return ctx.user;
};

const cleanTitle = (title) => {
  const trimmed = typeof title === 'string' ? title.trim() : '';
  if (!trimmed) throw badInput('title must not be blank');
  return trimmed;
};

const findOwnedOrThrow = (id, user) => {
  const game = gameRepository.findByIdAndOwner(id, user.id);
  if (!game) throw notFound();
  return game;
};

export const gameService = {
  login(username, password) {
    const user = findByCredentials(username, password);
    if (!user) throw unauthenticated('Invalid username or password');
    return { token: signToken(user) };
  },

  getGame(ctx, id) {
    const user = requireUser(ctx);
    return findOwnedOrThrow(id, user);
  },

  listGames(ctx, filters) {
    const user = requireUser(ctx);
    return gameRepository.findAllByOwner(user.id, filters);
  },

  createGame(ctx, input) {
    const user = requireUser(ctx);
    return gameRepository.create(user.id, { ...input, title: cleanTitle(input.title) });
  },

  updateGame(ctx, id, input) {
    const user = requireUser(ctx);
    const game = findOwnedOrThrow(id, user);

    const changes = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    );
    if (Object.keys(changes).length === 0) {
      throw badInput('at least one field must be provided');
    }
    if (Object.values(changes).some((value) => value === null)) {
      throw badInput('fields must not be null');
    }
    if ('title' in changes) changes.title = cleanTitle(changes.title);

    return gameRepository.update(game, changes);
  },

  deleteGame(ctx, id) {
    const user = requireUser(ctx);
    const game = findOwnedOrThrow(id, user);
    return gameRepository.remove(game);
  },
};
