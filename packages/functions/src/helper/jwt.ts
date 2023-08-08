import jwt from 'jsonwebtoken';
import { type iJwtPayload } from '../types/misc';

const createAccessToken = (userId: string): string => {
  const newToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30m'
  });
  return newToken;
};

const createRefreshToken = (userId: string): string => {
  const newToken = jwt.sign(
    { userId, isRefreshToken: true },
    process.env.JWT_SECRET,
    {
      expiresIn: '30m'
    }
  );
  return newToken;
};

const validateToken = (token): iJwtPayload | undefined => {
  const payload = jwt.verify(token, process.env.JWT_SECRET) as
    | iJwtPayload
    | undefined;
  return payload;
};

const Jwt = {
  createAccessToken,
  createRefreshToken,
  validateToken
};

export default Jwt;
