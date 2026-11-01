# Video Game Backlog GraphQL API

> A small GraphQL API to manage a personal video game backlog, built as a target for API test automation.

## Description

This project is a CRUD-style GraphQL API where each user manages their own list of games. Each game has a title, a platform and a status (`PLAYING`, `FINISHED` or `WISHLIST`). It is built with Node.js and Apollo Server, uses in-memory storage and simple JWT authentication, and was created to practice API testing (Supertest, Mocha and Chai are planned, see Features).

## Dependencies

- Node.js 20 or later
- npm

No database or external service is needed. Data lives in memory and is lost when the server stops.

## Technologies Used

| Package | Version | Purpose |
|---|---|---|
| `@apollo/server` | ^5.5.1 | GraphQL server |
| `graphql` | ^16.14.2 | GraphQL implementation (`GraphQLError`) |
| `express` | ^5.3.0 | HTTP layer |
| `@as-integrations/express5` | ^1.1.2 | Connects Apollo Server to Express |
| `jsonwebtoken` | ^9.0.3 | Signs and verifies JWT tokens |
| `dotenv` | ^18.0.9 | Loads environment variables |

## Installation and Setup

1. Clone the repository and enter the folder:

```bash
git clone <repository-url>
cd video-game-backlog-graphql
```

2. Install the dependencies:

```bash
npm i
```

3. (Optional) Create your environment file. Defaults exist, so this step can be skipped:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Server port |
| `JWT_SECRET` | `dev-secret-change-me` | Secret used to sign tokens |
| `JWT_EXPIRES_IN` | `1h` | Token lifetime |

4. Start the API:

```bash
npm run start:graphql
```

The API is available at `http://localhost:4000/graphql`. Opening that URL in a browser shows Apollo Sandbox, where you can run operations.

## Features

### Authentication

Call `login` first, then send the token on every other request:

```
Authorization: Bearer <token>
```

Fixed test users (no registration):

| Username | Password |
|---|---|
| `leon` | `umbrella123` |
| `kratos` | `spartan123` |
| `link` | `hyrule123` |

### Operations

| Type | Operation | Arguments | Description |
|---|---|---|---|
| Mutation | `login` | `username`, `password` | Returns a JWT token |
| Mutation | `createGame` | `input: { title, platform, status }` | Creates a game for the logged-in user |
| Mutation | `updateGame` | `id`, `input: { title?, platform?, status? }` | Partial update, at least one field required |
| Mutation | `deleteGame` | `id` | Deletes a game and returns it |
| Query | `game` | `id` | Returns one of the user's games |
| Query | `games` | `status?`, `platform?` | Lists the user's games, with optional filters |

All operations except `login` require a token. Each user only sees and changes their own games.

### Enums

| Enum | Values |
|---|---|
| `GameStatus` | `PLAYING`, `FINISHED`, `WISHLIST` |
| `Platform` | `PC`, `PS5`, `XBOX` |

### Error behavior

| Error | HTTP status | Code |
|---|---|---|
| Missing or invalid token, wrong login | 200 | `UNAUTHENTICATED` |
| Unknown id, or a game that belongs to another user | 200 | `NOT_FOUND` |
| Blank title, empty update | 200 | `BAD_USER_INPUT` |
| Invalid enum or wrong type in variables | 400 | `BAD_USER_INPUT` |
| Unknown field or invalid query | 400 | `GRAPHQL_VALIDATION_FAILED` |
| Malformed query syntax | 400 | `GRAPHQL_PARSE_FAILED` |

Errors raised inside the API return HTTP 200 with an `errors` array, so always check `errors[0].extensions.code` and not only the status.

### Example

```graphql
mutation CreateGame($input: CreateGameInput!) {
  createGame(input: $input) {
    id
    title
    platform
    status
  }
}
```

Variables:

```json
{
  "input": { "title": "GTA VI", "platform": "PS5", "status": "WISHLIST" }
}
```

### Tests

The automated test suite (Supertest, Mocha and Chai) is not implemented yet.

## File Structure

```
video-game-backlog-graphql/
├── src/
│   ├── schema/typeDefs.js             # GraphQL schema (SDL)
│   ├── resolvers/                     # Thin resolvers that call the service
│   ├── services/gameService.js        # Business rules, validation and auth checks
│   ├── repositories/gameRepository.js # In-memory storage
│   ├── auth/                          # JWT helpers and fixed users
│   ├── errors/errors.js               # NOT_FOUND, BAD_USER_INPUT, UNAUTHENTICATED helpers
│   ├── app.js                         # Builds the app without listening (used by tests)
│   └── server.js                      # Starts the HTTP server
├── .env.example                       # Environment variable template
├── CLAUDE.md                          # Guidance for Claude Code
└── package.json
```

## Author

Rafael
