import { MongoClient, ObjectId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { type Token } from './types/models';
import Jwt from './helper/jwt';
import { SERVER_ERROR } from './types/responses';
import { mongoClientOptions, mongoClientUrl } from './helper/connect';

const client = new MongoClient(mongoClientUrl, mongoClientOptions);

/**
 * Pass refresh token in header
 * Validates refresh token and check it against the db
 * If exists in db, it sends back a new access token
 */
export const get = dbWrapper<{}, string>(client, async ({ db, event }) => {
  // the wrapper isn't going to let the refresh token pass, so handle it here

  const refreshToken = event?.headers?.authorization?.split(' ')?.[1];
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

  const newAccessToken = Jwt.createAccessToken(userId);

  return {
    statusCode: 200,
    data: newAccessToken
  };
});

/**
 * Creates a refresh token
 * Notably, this requires an access token, so that must be created first
 */
export const post = dbWrapper<{}, string>(
  client,
  async ({ db, authenticatedUserId }) => {
    if (!authenticatedUserId) {
      return SERVER_ERROR.Unauthenticated;
    }

    const refreshToken = Jwt.createRefreshToken(authenticatedUserId);

    try {
      // upserting just in case this token already exists
      await db.collection<Token>('tokens').findOneAndUpdate(
        { token: refreshToken },
        {
          $set: {
            userId: new ObjectId(authenticatedUserId),
            token: refreshToken
          }
        },
        { upsert: true }
      );
      return {
        statusCode: 200,
        data: refreshToken
      };
    } catch (e) {
      console.error('error creating refresh token', e);
      return SERVER_ERROR.ServerError;
    }
  }
);

/**
 * Deletes a refresh token
 */
export const remove = dbWrapper<{ token: string }, string>(
  client,
  async ({ db, params: { token } }) => {
    const tokens = db.collection<Token>('tokens');

    if (!token) {
      return {
        ...SERVER_ERROR.BadRequest,
        message: 'Missing path property: token'
      };
    }

    try {
      await tokens.deleteOne({ token });
      return { statusCode: 200 };
    } catch (e) {
      return SERVER_ERROR.ServerError;
    }
  }
);

/**
 * Removes all tokens associated with a user
 */
export const removeAll = dbWrapper<{ token: string }, string>(
  client,
  async ({ db, authenticatedUserId: userId }) => {
    if (!userId) {
      return SERVER_ERROR.Unauthenticated;
    }

    const tokens = db.collection<Token>('tokens');

    try {
      await tokens.deleteMany({ userId: new ObjectId(userId) });
      return { statusCode: 200 };
    } catch (e) {
      return SERVER_ERROR.ServerError;
    }
  }
);
