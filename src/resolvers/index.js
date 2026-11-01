import { queryResolvers } from './queryResolvers.js';
import { mutationResolvers } from './mutationResolvers.js';

export const resolvers = {
  Query: queryResolvers,
  Mutation: mutationResolvers,
};
