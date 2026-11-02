# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

QA portfolio project: a small GraphQL API (Video Game Backlog) built to be a target for API test automation (Supertest + Mocha + Chai, then GitHub Actions). The API is intentionally simple: one entity, in-memory storage, simple JWT auth. Do not add entities, a database, or complex auth. The approved design lives in `C:\Users\faels\.claude\plans\pasted-content-id-86a6-role-reflective-mochi.md` (outside the repo).

## Commands

```
npm i
npm run start:graphql     # or: npm start / npm run dev (node --watch)
```

Server listens on `PORT` (default 4000) at `http://localhost:4000/graphql`. Copy `.env.example` to `.env` to set `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN` (defaults exist, so `.env` is optional).

```
npm test                  # Mocha + Chai + Supertest against a LIVE server (start it first)
npm run test:report       # same, Mochawesome HTML in mochawesome-report/
```

API tests send real HTTP to `BASE_URL` (default `http://localhost:4000`); they do not use `createApp()` or mocks. Start the server (`npm start`) before running them. There is no `reset()` on a live server: each test creates its own data via `createGame()` and the root `afterEach` hook in `test/hooks/auth.js` deletes it. `TC-04-01` (empty list, user `link`) assumes a fresh store. Layout: `test/<feature>/*.test.js`, `test/helpers/graphql.js`, data-driven cases in `fixtures/*.json`, `.mocharc.cjs` (CJS because the package is ESM). Test IDs (`TC-US-NN`) refer to the test-conditions table (US-01 login ... US-07 auth enforcement).

Node >= 20, ESM only (`"type": "module"`): use `import`, and include the `.js` extension in relative imports.

## Architecture

Request flow: `Resolvers -> Service -> Repository` (in-memory array). Single endpoint `POST /graphql`.

- `src/app.js` exports `createApp()` which builds Express + Apollo Server 5 (`@as-integrations/express5`) without calling `listen`. `src/server.js` is the only place that listens.
- `src/resolvers/` are thin pass-throughs. All business rules, validation and auth checks are in `src/services/gameService.js`.
- `src/repositories/gameRepository.js` holds the store. It exposes `reset()` for test isolation. Each game has a hidden `ownerId` that is not in the GraphQL schema.
- `src/auth/`: `users.js` is a fixed in-memory user list (no registration). `jwt.js` signs tokens and decodes `Authorization: Bearer <token>`.
- `src/errors/errors.js` has `notFound()`, `badInput()`, `unauthenticated()`, each a `GraphQLError` with `extensions.code`.

## Behaviors that are easy to get wrong

- **Auth is enforced in the service, not in `context`.** `getUserFromRequest` never throws; it returns `null` for a missing/invalid token and the service throws `UNAUTHENTICATED`. This keeps the error at HTTP 200. Throwing from the `context` function would change the status code.
- **Every operation except `login` requires a token.** Games are scoped per user: `games` returns only the caller's games. Another user's game id returns `NOT_FOUND` (not a forbidden error) for `game`, `updateGame`, `deleteGame`.
- **HTTP status depends on where the error happens.** Errors thrown in resolvers/services (`NOT_FOUND`, `UNAUTHENTICATED`, `BAD_USER_INPUT` for blank title or empty update) return HTTP 200 with an `errors` array. Request-level errors (parse, validation, bad variable values such as `platform: "ps5"`) are rejected by Apollo/graphql before resolvers run and return HTTP 400. Tests must assert on `errors[0].extensions.code`, not only on status.
- `Platform` (`PC`, `PS5`, `XBOX`) and `GameStatus` (`PLAYING`, `FINISHED`, `WISHLIST`) are enums and case-sensitive. A new value goes in `src/schema/typeDefs.js`.
- `createGame` input must be an object (`title`, `platform`, `status` all required). Sending a bare string fails with `BAD_USER_INPUT` (expected behavior, not a bug).
- `updateGame` checks game existence first, then rejects an empty input or null fields (`BAD_USER_INPUT`). Title is trimmed and must be non-empty; no max length; duplicates allowed.
- `includeStacktraceInErrorResponses` is off in `src/app.js` so error payloads are stable for assertions.

## Test users

Fixed in `src/auth/users.js`: `leon`/`umbrella123` (default manual-testing user), `kratos`/`spartan123`, `link`/`hyrule123`. The store starts empty on every start (no seed data).
