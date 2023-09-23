import { ObjectId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { type Token } from './types/models';
import Jwt from './helper/jwt';
import { SERVER_ERROR } from './types/responses';

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
      ...SERVER_ERROR.BadRequest,
      message: 'Requires token'
    };
  }

  const jwtPayload = Jwt.validateToken(refreshToken);
  const { userId, isRefreshToken } = jwtPayload ?? {};
  if (!isRefreshToken || !userId) {
    return {
      ...SERVER_ERROR.InvalidTokenError,
      message: 'Invalid refresh token'
    };
  }

  const dbToken = await db.collection<Token>('tokens').findOne({
    token: refreshToken,
    userId: new ObjectId(userId)
  });
  if (!dbToken) {
    return SERVER_ERROR.RevokeAccess;
  }

  return {
    statusCode: 200,
    data: Jwt.createAccessToken(userId)
  };
});

/**
 * Creates a refresh token
 * Notably, this requires an access token, so that must be created first
 */
export const post = dbWrapper<{}, string>(
  async ({ db, authenticatedUserId }) => {
    if (!authenticatedUserId) {
      return SERVER_ERROR.Unauthenticated;
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

/**
 * Deletes a single refresh token (used on log out)
 */
export const remove = dbWrapper<undefined, string>(
  async ({ db, params: { token }, authenticatedUserId: userId }) => {
    if (!userId) {
      return SERVER_ERROR.Unauthenticated;
    }

    if (!token) {
      return {
        ...SERVER_ERROR.BadRequest,
        message: 'Missing path property: token'
      };
    }

    const tokens = db.collection<Token>('tokens');

    await tokens.deleteOne({ token });

    return { statusCode: 200 };
  }
);

/**
 * Deletes all user tokens associated with authed user
 */
export const removeUserTokens = dbWrapper<undefined, string>(
  async ({ db, authenticatedUserId: userId }) => {
    if (!userId) {
      return SERVER_ERROR.Unauthenticated;
    }

    if (!userId) {
      return {
        ...SERVER_ERROR.BadRequest,
        message: 'Missing path property: userId'
      };
    }

    const tokens = db.collection<Token>('tokens');

    await tokens.deleteMany({ userId: new ObjectId(userId) });

    return { statusCode: 200 };
  }
);
