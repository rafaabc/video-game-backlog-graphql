import { USERS, gql, ops, tokens, cleanup } from '../helpers/graphql.js';

export const mochaHooks = {
  async beforeAll() {
    for (const { username, password } of Object.values(USERS)) {
      const res = await gql(ops.login, { username, password });
      if (res.status !== 200 || !res.body.data?.login?.token) {
        throw new Error(
          `Login failed for ${username}. Is the server running at ${process.env.BASE_URL ?? 'http://localhost:4000'}?`,
        );
      }
      tokens[username] = res.body.data.login.token;
    }
  },
  async afterEach() {
    await cleanup();
  },
};
