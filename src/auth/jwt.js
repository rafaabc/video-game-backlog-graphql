import jwt from 'jsonwebtoken';

const secret = () => process.env.JWT_SECRET ?? 'dev-secret-change-me';
const expiresIn = () => process.env.JWT_EXPIRES_IN ?? '1h';

export const signToken = (user) =>
  jwt.sign({ sub: user.id, username: user.username }, secret(), { expiresIn: expiresIn() });

// Lenient on purpose: never throws. Returns the user or null.
// The authentication decision (UNAUTHENTICATED) is made in the service layer so it stays HTTP 200.
export const getUserFromRequest = (req) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  try {
    const payload = jwt.verify(token, secret());
    return { id: payload.sub, username: payload.username };
  } catch {
    return null;
  }
};
