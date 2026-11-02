import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import { gql, ops, loadFixture, errorCode, createGame, sampleGame } from '../helpers/graphql.js';

const { validUsers, invalidCredentials, missingArguments } = loadFixture('login');

describe('US-01 Login', () => {
  describe('valid credentials', () => {
    validUsers.forEach(({ username, password }) => {
      it(`TC-01-01/02 returns a token for ${username}`, async () => {
        const res = await gql(ops.login, { username, password });

        expect(res.status).to.equal(200);
        expect(res.body.errors).to.equal(undefined);
        expect(res.body.data.login).to.have.all.keys('token');
        expect(res.body.data.login.token).to.be.a('string').that.is.not.empty;
      });
    });

    it('TC-01-03 returned token is accepted by a protected operation', async () => {
      const login = await gql(ops.login, validUsers[0]);
      const res = await gql(ops.list, {}, login.body.data.login.token);

      expect(res.status).to.equal(200);
      expect(res.body.errors).to.equal(undefined);
      expect(res.body.data.games).to.be.an('array');
    });

    it('TC-01-04 token identifies the logging-in user', async () => {
      const login = await gql(ops.login, { username: 'kratos', password: 'spartan123' });
      const payload = jwt.decode(login.body.data.login.token);

      expect(payload.username).to.equal('kratos');
      expect(payload.sub).to.be.a('string');
    });

    it('TC-01-10 login works without an Authorization header', async () => {
      const res = await gql(ops.login, validUsers[0]);

      expect(res.status).to.equal(200);
      expect(res.body.errors).to.equal(undefined);
    });

    it('TC-01-12 response does not expose the password', async () => {
      const res = await gql(ops.login, validUsers[0]);

      expect(JSON.stringify(res.body)).to.not.include(validUsers[0].password);
    });

    it('TC-01-13 token lifetime matches JWT_EXPIRES_IN', async () => {
      const ttl = Number(process.env.TOKEN_TTL_SECONDS ?? 3600);
      const res = await gql(ops.login, validUsers[0]);
      const { iat, exp } = jwt.decode(res.body.data.login.token);

      expect(exp - iat).to.equal(ttl);
    });
  });

  describe('invalid credentials', () => {
    invalidCredentials.forEach(({ description, username, password }) => {
      it(`TC-01-05..08 rejects ${description}`, async () => {
        const res = await gql(ops.login, { username, password });

        expect(res.status).to.equal(200);
        expect(errorCode(res)).to.equal('UNAUTHENTICATED');
        expect(res.body.data).to.equal(null);
      });
    });

    it('TC-01-11 wrong user and wrong password return the same error message', async () => {
      const wrongUser = await gql(ops.login, { username: 'nobody', password: 'umbrella123' });
      const wrongPass = await gql(ops.login, { username: 'leon', password: 'wrong' });

      expect(wrongUser.body.errors[0].message).to.equal(wrongPass.body.errors[0].message);
    });
  });

  describe('request-level validation', () => {
    missingArguments.forEach(({ description, variables }) => {
      it(`TC-01-09 rejects with HTTP 400 when ${description}`, async () => {
        const res = await gql(ops.login, variables);

        expect(res.status).to.equal(400);
        expect(res.body.errors).to.be.an('array').that.is.not.empty;
      });
    });
  });
});
