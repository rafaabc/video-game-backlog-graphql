import { GraphQLError } from 'graphql';

// No `http` extension on purpose: resolver-level errors return HTTP 200 (GraphQL style).
const build = (message, code) => new GraphQLError(message, { extensions: { code } });

export const notFound = (message = 'Game not found') => build(message, 'NOT_FOUND');
export const badInput = (message) => build(message, 'BAD_USER_INPUT');
export const unauthenticated = (message = 'Authentication required') =>
  build(message, 'UNAUTHENTICATED');
