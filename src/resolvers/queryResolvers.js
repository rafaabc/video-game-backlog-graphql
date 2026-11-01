import { gameService } from '../services/gameService.js';

export const queryResolvers = {
  game: (_, { id }, ctx) => gameService.getGame(ctx, id),
  games: (_, args, ctx) => gameService.listGames(ctx, args),
};
