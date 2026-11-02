import { gameService } from '../services/gameService.js';

export const mutationResolvers = {
  login: (_, { username, password }) => gameService.login(username, password),
  createGame: (_, { input }, ctx) => gameService.createGame(ctx, input),
  updateGame: (_, { id, input }, ctx) => gameService.updateGame(ctx, id, input),
  deleteGame: (_, { id }, ctx) => gameService.deleteGame(ctx, id),
};
