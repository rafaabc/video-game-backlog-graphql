import { readFileSync } from 'node:fs';
import request from 'supertest';

export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4000';

export const USERS = {
  leon: { username: 'leon', password: 'umbrella123' },
  kratos: { username: 'kratos', password: 'spartan123' },
  link: { username: 'link', password: 'hyrule123' },
};

export const loadFixture = (name) =>
  JSON.parse(readFileSync(new URL(`../../fixtures/${name}.json`, import.meta.url), 'utf8'));

// Raw POST /graphql. `authorization` is the full header value (undefined = no header).
export const gqlRaw = (query, variables, authorization) => {
  const req = request(BASE_URL).post('/graphql').send({ query, variables });
  if (authorization !== undefined) req.set('Authorization', authorization);
  return req;
};

export const gql = (query, variables, token) =>
  gqlRaw(query, variables, token ? `Bearer ${token}` : undefined);

export const ops = {
  login: `mutation($username: String!, $password: String!) { login(username: $username, password: $password) { token } }`,
  create: `mutation($input: CreateGameInput!) { createGame(input: $input) { id title platform status } }`,
  get: `query($id: ID!) { game(id: $id) { id title platform status } }`,
  list: `query($status: GameStatus, $platform: Platform) { games(status: $status, platform: $platform) { id title platform status } }`,
  update: `mutation($id: ID!, $input: UpdateGameInput!) { updateGame(id: $id, input: $input) { id title platform status } }`,
  remove: `mutation($id: ID!) { deleteGame(id: $id) { id title platform status } }`,
};

// Tokens are filled once by the root hook in test/hooks/auth.js.
export const tokens = {};
export const getToken = (username = 'leon') => tokens[username];

// Games created during a test are deleted afterwards (live server: no reset()).
const created = [];

export const createGame = async (username, input) => {
  const res = await gql(ops.create, { input }, getToken(username));
  if (res.body.errors) throw new Error(`setup createGame failed: ${JSON.stringify(res.body.errors)}`);
  const game = res.body.data.createGame;
  created.push({ username, id: game.id });
  return game;
};

export const cleanup = async () => {
  while (created.length) {
    const { username, id } = created.pop();
    await gql(ops.remove, { id }, getToken(username));
  }
};

export const sampleGame = (overrides = {}) => ({
  title: 'Hollow Knight',
  platform: 'PC',
  status: 'PLAYING',
  ...overrides,
});

export const errorCode = (res) => res.body.errors?.[0]?.extensions?.code;
