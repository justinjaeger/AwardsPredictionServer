import jwt from 'jsonwebtoken';
import { type iJwtEmailPayload, type iJwtPayload } from '../types/misc';

/**
 * For sessions:
 */
const createAccessToken = (userId: string): string => {
  const newToken = jwt.sign({ userId }, process.env.JWT_SECRET ?? '', {
    expiresIn: '30m'
  });
  return newToken;
};
const createRefreshToken = (userId: string): string => {
  const newToken = jwt.sign(
    { userId, isRefreshToken: true },
    process.env.JWT_SECRET ?? ''
  );
  return newToken;
};
const validateToken = (token: string): iJwtPayload | undefined => {
  const payload = jwt.verify(token, process.env.JWT_SECRET ?? '') as
    | iJwtPayload
    | undefined;
  return payload;
};

/**
 * For email verification:
 */
const createEmailToken = (email: string): string => {
  const newToken = jwt.sign({ email }, process.env.JWT_SECRET ?? '', {
    expiresIn: '10m'
  });
  return newToken;
};
const validateEmailToken = (token: string): iJwtEmailPayload | undefined => {
  const payload = jwt.verify(token, process.env.JWT_SECRET ?? '') as
    | iJwtEmailPayload
    | undefined;
  return payload;
};

const Jwt = {
  createAccessToken,
  createRefreshToken,
  validateToken,
  createEmailToken,
  validateEmailToken
};

export default Jwt;
