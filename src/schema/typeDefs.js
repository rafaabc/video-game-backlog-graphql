export const typeDefs = `#graphql
  enum GameStatus {
    PLAYING
    FINISHED
    WISHLIST
  }

  enum Platform {
    PC
    PS5
    XBOX
  }

  type Game {
    id: ID!
    title: String!
    platform: Platform!
    status: GameStatus!
  }

  input CreateGameInput {
    title: String!
    platform: Platform!
    status: GameStatus!
  }

  input UpdateGameInput {
    title: String
    platform: Platform
    status: GameStatus
  }

  type AuthPayload {
    token: String!
  }

  type Query {
    game(id: ID!): Game
    games(status: GameStatus, platform: Platform): [Game!]!
  }

  type Mutation {
    login(username: String!, password: String!): AuthPayload!
    createGame(input: CreateGameInput!): Game!
    updateGame(id: ID!, input: UpdateGameInput!): Game!
    deleteGame(id: ID!): Game!
  }
`;
