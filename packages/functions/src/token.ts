import { ObjectId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { type Token } from './types/models';
import Jwt from './helper/jwt';

/**
 * Pass refresh token in header
 * Validates refresh token and check it against the db
 * If exists in db, it sends back a new access token
 */
export const get = dbWrapper<{}, string>(async ({ db, event }) => {
  // the wrapper isn't going to let the refresh token pass, so handle it here
  const refreshToken = event?.headers?.Authorization?.split(' ')[1];
  if (!refreshToken) {
    return {
      statusCode: 400,
      error: 'BadRequest',
      message: 'Requires token'
    };
  }
  const jwtPayload = Jwt.validateToken(refreshToken);
  const { userId, isRefreshToken } = jwtPayload ?? {};
  if (!isRefreshToken || !userId) {
    return {
      statusCode: 401,
      error: 'InvalidTokenError',
      message: 'Invalid token'
    };
  }
  const tokens = db.collection<Token>('tokens');
  const dbToken = await tokens.findOne({
    token: refreshToken,
    userId: new ObjectId(userId)
  });
  if (!dbToken) {
    return {
      statusCode: 403,
      error: 'Forbidden',
      message: 'No matching token in db - log the user out'
    };
  }
  const newAccessToken = Jwt.createAccessToken(userId);
  return {
    statusCode: 200,
    data: newAccessToken
  };
});

// returns Token[]
export const list = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200
  };
});

/**
 * Creates a refresh token
 * Notably, this requires an access token, so that must be created first
 */
export const post = dbWrapper<{}, string>(
  async ({ db, authenticatedUserId }) => {
    if (!authenticatedUserId) {
      return { statusCode: 401, error: 'Unauthenticated' };
    }

    const refreshToken = Jwt.createRefreshToken(authenticatedUserId);

    const tokens = db.collection<Token>('tokens');
    await tokens.insertOne({
      userId: new ObjectId(authenticatedUserId),
      token: refreshToken
    });

    return {
      statusCode: 200,
      data: refreshToken
    };
  }
);
