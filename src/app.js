import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { typeDefs } from './schema/typeDefs.js';
import { resolvers } from './resolvers/index.js';
import { getUserFromRequest } from './auth/jwt.js';

// Builds the app WITHOUT listening; src/server.js is the only place that calls listen.
export async function createApp() {
  // Stacktraces off: cleaner, stable error payloads for assertions.
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    includeStacktraceInErrorResponses: false,
  });
  await server.start();

  const app = express();
  app.use(
    '/graphql',
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({ user: getUserFromRequest(req) }),
    }),
  );

  return { app, server };
}
